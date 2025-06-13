import baseData from "../data/data.json";

const data = baseData as Section[];

import type { Section, SectionContent } from "./structure";

// const count = (s: string) => {
//   const words = s
//     .normalize("NFD")
//     .replace(/[\u0300-\u036f]/g, "")
//     .toLowerCase()
//     .replace(/[^a-z0-9‑ ]/g, "")
//     .split(" ");

//   const dash = {} as any;
//   const plain = {} as any;
//   for (const w of words) {
//     if (["re‑", "pre‑", "co‑"].some((x) => w.startsWith(x))) {
//       dash[w] = (dash[w] || 0) + 1;
//     } else if (["re", "pre", "co"].some((x) => w.startsWith(x))) {
//       plain[w] = (plain[w] || 0) + 1;
//     }
//   }

//   for (const w of Object.keys(dash)) {
//     console.log(`${w}: ${dash[w]}`);
//     console.log(`${w.replace(/‑/g, "")}: ${plain[w.replace(/‑/g, "")] || 0}`);
//   }
// };
// count(JSON.stringify(baseData));

type SemiRenderContent =
  | { type: "break" }
  | {
      type: "normal" | "info" | "call" | "framing" | "lines";
      parts: {
        text: string;
        quoted: number;
        quote?: true | { section: string; paragraph: number };
      }[][];
    };

type RenderContent =
  | { type: "break" }
  | {
      type: "normal" | "info" | "call" | "framing" | "lines";
      parts: {
        text: string;
        quoted: number;
        quote?: true | [string, string][];
      }[][];
      paragraph: string;
      quote?: [string, string][];
      quoted?: [string, string][][];
    };

interface RenderSection {
  id: string;
  path: [string, string, number][];
  years: [number, number];
  translated?: string;
  meta?: string;
  reference?: string;
  source?: string;
  summary?: string;
  prayer?: true;
  content: RenderContent[];
}

const getQuote = (p: {
  section: string;
  paragraph: number;
  start: number;
  end: number;
}): string => {
  const source = data.find((d) => d.id === p.section)!;
  return getText(source.content[p.paragraph]!).slice(p.start, p.end);
};

const getText = (c: SectionContent): string => {
  if (typeof c === "string") return c;
  if (!Array.isArray(c)) {
    if ("type" in c && c.type === "break") return "";
    return c.text;
  }
  return c.map((p) => (typeof p === "string" ? p : getQuote(p))).join("");
};

const getParagraph = (para: SectionContent): SemiRenderContent => {
  const text = getText(para);
  if (!text) return { type: "break" };
  if (typeof para === "string") {
    return { type: "normal", parts: [[{ text, quoted: 0 }]] };
  }
  if (Array.isArray(para)) {
    if (para.length === 1) {
      const quote = para[0]!;
      if (
        typeof quote !== "string" &&
        quote.start === 0 &&
        quote.end === text.length
      ) {
        const res = getParagraph(
          data.find((d) => d.id === quote.section)!.content[quote.paragraph]!
        ) as any;
        return {
          type: res.type,
          parts: res.parts.map((line: any) =>
            line.map((p: any) => ({
              ...p,
              quote: { section: quote.section, paragraph: quote.paragraph },
              quoted: 0,
            }))
          ),
        };
      }
    }
    return {
      type: "normal",
      parts: [
        para.map((p) =>
          typeof p === "string"
            ? { text: p, quoted: 0 }
            : {
                text: getQuote(p).replace(/“/g, "‘").replace(/”/g, "’"),
                quote: { section: p.section, paragraph: p.paragraph },
                quoted: 0,
              }
        ),
      ],
    };
  }
  if ("type" in para) {
    return { type: para.type, parts: [[{ text, quoted: 0 }]] };
  }
  return {
    type: "lines",
    parts: para.lines
      .slice(1)
      .map((end, i) => [
        { text: text.slice(para.lines[i], end - 1), quoted: 0 },
      ]),
  };
};

const capitalised = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const getParagraphId = (section: Section, paragraph: number) => {
  let currentMain = 1;
  let currentSpecial = 1;
  const allIds = section.content.map((para) => {
    if (typeof para === "string") return `${currentMain++}`;
    if ("type" in para) {
      if (para.type === "break") return "";
      return `${currentMain}_${currentSpecial++}`;
    }
    return `${currentMain++}`;
  });
  return allIds[paragraph]!;
};

const simplifyLinkLabels = {
  "Gleanings from the Writings of Bahá’u’lláh": "Gleanings",
  "Tablets of Bahá’u’lláh": "Tablets",
  "Selections from the Writings of ‘Abdu’l‑Bahá": "Selections",
  "Additional Tablets, Extracts and Talks": "Additional",
  "Commissioned by the Universal House of Justice": "Publications",
} as Record<string, string>;

const getUrlPath = ({
  section: sectionId,
  paragraph,
}: {
  section: string;
  paragraph: number;
}): [string, string][] => {
  let current = "";
  const section = data.find((d) => d.id === sectionId)!;
  const paraId = getParagraphId(section, paragraph);
  const res: [string, string][] = [
    ...(section.path.map((p) => {
      current = `${current}/${p[1]}`;
      return [
        simplifyLinkLabels[p[0]] || p[0].replace(/ \([^\)]*\)/, ""),
        current,
      ];
    }) as [string, string][]),
    [`Para ${paraId}`, `${current}#${paraId}`],
  ];
  if (res[1]![0] === "The Summons of the Lord of Hosts") {
    res.splice(1, 1);
  }
  if (res[1]![0] === "The Promulgation of Universal Peace") {
    res[3]![0] = res[3]![0].split(":")[0]!;
    res.splice(2, 1);
  }
  if (res[1]![0] === "Tablets of the Divine Plan") {
    res[2]![0] = res[2]![0].split(":")[0]!;
  }
  if (res[1]![0] === "The World Order of Bahá’u’lláh") {
    res.splice(1, 1);
  }
  if (res[1]![0] === "Selected Messages of the Universal House of Justice") {
    res[2]![0] = res[2]![0].split(",")[0]!;
    res.splice(1, 1);
  }

  return res;
};

export default function getData(...urlPath: string[]): RenderSection[] {
  return data
    .filter((d) => !d.prayer)
    .filter((d) => !d.meta && urlPath.every((p, i) => d.path[i]?.[1] === p))
    .map((d) => {
      const content = d.content.map((c, i): SemiRenderContent => {
        const para = getParagraph(c);
        if (para.type === "break") return para;

        // CAPITALISE QUOTES
        for (const line of para.parts) {
          for (let i = 0; i < line.length; i++) {
            if (line[i]!.quote) {
              const pre = (
                (line[i - 1]?.text || "")
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
                  .replace(/\[[^\]]*\]/g, "")
                  .match(/[^a-z0-9]*$/)?.[0] || ""
              ).replace(/[“”‘’ ]/g, "");
              if (
                !pre ||
                ([".", "!", "?"].includes(pre[pre.length - 1]!) &&
                  !pre.endsWith(". . ."))
              ) {
                // if (line[i]!.text !== capitalised(line[i]!.text)) {
                //   console.log(line[i]!.text);
                // }
                line[i]!.text = capitalised(line[i]!.text);
              }
            }
          }
        }

        // FILL OUT QUOTES
        if (
          para.parts.every((line) =>
            line.every(
              (part) =>
                part.quote ||
                !/[a-z0-9]/.test(
                  part.text
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .replace(/\[[^\]]*\]/g, "")
                )
            )
          )
        ) {
          const allQuotes = [
            ...new Set(
              para.parts.flatMap((line) =>
                line.flatMap((part) =>
                  part.quote ? [JSON.stringify(part.quote)] : []
                )
              )
            ),
          ].map((q) => JSON.parse(q));
          if (allQuotes.length === 1) {
            para.parts = para.parts.map((line) => [
              {
                text: line.map((part) => part.text).join(""),
                quote: allQuotes[0],
                quoted: 0,
              },
            ]);
          } else {
            for (const line of para.parts) {
              for (let i = 0; i < line.length; i++) {
                line[i]!.quote = true;
              }
            }
          }
        } else {
          for (const line of para.parts) {
            for (let i = 0; i < line.length; i++) {
              const current = line[i]!;
              const prev = line[i - 1];
              const next = line[i + 1];
              if (
                !current.quote &&
                current.text === " . . . " &&
                prev?.quote &&
                next?.quote
              ) {
                current.quote = true;
              }
              if (current.quote && prev && !prev.quote) {
                const pre = prev.text.match(/“[^a-z0-9‘]*$|‘[^a-z0-9“]*$/)?.[0];
                if (pre) {
                  current.text = `${pre}${current.text}`;
                  prev.text = prev.text.slice(0, prev.text.length - pre.length);
                }
              }
              if (current.quote && next && !next.quote) {
                const post = next.text.match(
                  /^[^a-z0-9’]*”|^[^a-z0-9”]*’/
                )?.[0];
                if (post) {
                  current.text = `${current.text}${post}`;
                  next.text = next.text.slice(post.length);
                }
              }
            }
          }
          for (let i = 0; i < para.parts.length; i++) {
            para.parts[i] = para.parts[i]!.filter((part) => part.text);
          }
        }

        // ADD QUOTED COUNTS
        const quoted = (d.quoted || {})[i] || [];
        const quotedIndices = [
          ...new Set(quoted.flatMap((q) => [q.start, q.end])),
        ].sort((a, b) => a - b);
        let currentIndex = 0;
        const lines = para.parts.map((line) => {
          const res: {
            text: string;
            quoted: number;
            quote?: true | { section: string; paragraph: number };
          }[] = [];
          for (const part of line) {
            const partIndices = quotedIndices
              .map((x) => x - currentIndex)
              .filter((q) => q > 0 && q < part.text.length);
            let prev = 0;
            for (const index of partIndices) {
              res.push({
                text: part.text.slice(prev, index),
                quoted: quoted.filter(
                  (q) =>
                    currentIndex + prev >= q.start &&
                    currentIndex + index <= q.end
                ).length,
                quote: part.quote,
              });
              prev = index;
            }
            res.push({
              text: part.text.slice(prev),
              quoted: quoted.filter(
                (q) =>
                  currentIndex + prev >= q.start &&
                  currentIndex + part.text.length <= q.end
              ).length,
              quote: part.quote,
            });
            currentIndex += part.text.length;
          }
          currentIndex += 1;
          return res;
        });

        return {
          type: para.type,
          parts: lines,
        };

        // if (!Array.isArray(c)) return [getText(c)];
        // const res: any = c.map((p) => {
        //   if (typeof p === "string") return p;
        //   const source = data.find((d) => d.id === p.section)!;
        //   return {
        //     quote: getText(source.content[p.paragraph]!).slice(p.start, p.end),
        //     path: source.path,
        //     paragraph: p.paragraph + 1,
        //   };
        // });
      });
      return {
        ...d,
        content: content.map((para, index) => {
          if (para.type === "break") return para;
          if (para.parts.every((line) => line.every((part) => part.quote))) {
            const allQuotes = [
              ...new Set(
                para.parts.flatMap((line) =>
                  line.flatMap((part) =>
                    part.quote && part.quote !== true
                      ? [JSON.stringify(part.quote)]
                      : []
                  )
                )
              ),
            ].map((x) => JSON.parse(x));
            if (allQuotes.length === 1) {
              return {
                ...para,
                parts: para.parts.map((line) =>
                  line.map((part) => ({ ...part, quote: true }))
                ),
                paragraph: getParagraphId(d, index),
                quote: getUrlPath(allQuotes[0]),
                quoted: d.quoted?.[index]?.map((q) => getUrlPath(q)),
              };
            }
          }
          return {
            ...para,
            parts: para.parts.map((lines) =>
              lines.map((part) => ({
                ...part,
                quote:
                  part.quote &&
                  (part.quote === true ? true : getUrlPath(part.quote)),
              }))
            ),
            paragraph: getParagraphId(d, index),
            quoted: d.quoted?.[index]?.map((q) => getUrlPath(q)),
          };
        }),
      };
    });
}
