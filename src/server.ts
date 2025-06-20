import baseData from "../data/data.json";
import baseSearch from "../data/search.txt";

const data = baseData as Section[];
const dataWithIndices = data.map((section, index) => ({ section, index }));

import stem from "./searchStem";
import type { Section, SectionContent } from "./structure";

type SemiRenderContent =
  | { type: "break" }
  | {
      type: "normal" | "info" | "call" | "framing" | "lines";
      parts: {
        text: string;
        quoted: number;
        quote?: true | { section: number; paragraph: number };
      }[][];
    };

type RenderContent =
  | { type: "break" }
  | {
      type: "normal" | "info" | "call" | "framing" | "lines";
      parts: {
        text: string;
        quoted: number;
        highlight?: true;
        quote?: true | [string, string][];
      }[][];
      paragraph: string;
      quote?: true | [string, string][];
      quoted?: [string, string][][];
    };

export interface RenderSection {
  path: [string, string, number][];
  years: [number, number];
  translated?: string;
  meta?: string;
  reference?: string;
  source?: string;
  summary?: string;
  prayer?: string;
  content: RenderContent[];
}

const getQuote = (p: {
  section: number;
  paragraph: number;
  start: number;
  end: number;
}): string => {
  const source = data[p.section]!;
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
        quote.end ===
          getText(data[quote.section]!.content[quote.paragraph]!).length
      ) {
        const res = getParagraph(
          data[quote.section]!.content[quote.paragraph]!
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

const getParagraphIds = (section: Section) => {
  let currentMain = 1;
  let currentSpecial = 0;
  const allIds = section.content.map((para) => {
    if (typeof para === "string") return `${currentMain++}`;
    if ("type" in para) {
      if (para.type === "break") return "";
      return `${currentMain}${["a", "b", "c", "d", "e"][currentSpecial++]}`;
    }
    return `${currentMain++}`;
  });
  return allIds;
};

const simplifyLinkLabels = {
  "Gleanings from the Writings of Bahá’u’lláh": "Gleanings",
  "Tablets of Bahá’u’lláh": "Tablets",
  "Selections from the Writings of ‘Abdu’l‑Bahá": "Selections",
  "Commissioned by the Universal House of Justice": "Publications",
} as Record<string, string>;

const getUrlPath = ({
  section: sectionId,
  paragraph,
  start,
}: {
  section: number;
  paragraph: number;
  start?: number;
}): [string, string][] => {
  let current = "";
  const section = data[sectionId]!;
  const res: [string, string][] = section.path.map((p) => {
    current = `${current}/${p[1]}`;
    return [
      simplifyLinkLabels[p[0]] || p[0].replace(/ \([^\)]*\)/, ""),
      current,
    ];
  });
  if (
    !(
      (start === undefined ? paragraph : start) === 0 &&
      paragraph === data[sectionId]!.content.length - 1
    )
  ) {
    const paraId = getParagraphIds(section)[paragraph];
    const startParaId =
      start === undefined ? start : getParagraphIds(section)[start];
    res.push([
      startParaId ? `Paras ${startParaId}-${paraId}` : `Para ${paraId}`,
      `${current}#${startParaId || paraId}`,
    ]);
  }
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
  if (res[1]![0] === "Some Answered Questions") {
    res[2]![0] = res[2]![0].split(":")[0]!;
  }
  if (res[1]![0] === "The World Order of Bahá’u’lláh") {
    res.splice(1, 1);
  }
  if (res[1]![0] === "God Passes By") {
    res[2]![0] = res[2]![0].split(":")[0]!;
  }
  if (
    res[0]![0] === "The Universal House of Justice" &&
    res[1]![0] === "Selected Messages"
  ) {
    res[2]![0] = res[2]![0].split(",")[0]!;
    res.splice(1, 1);
  }

  return res;
};

const contentToSemi = (c: SectionContent, quoted: any[]): SemiRenderContent => {
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
            .replace(/\[([^\]]*)\]/g, (_, a) => a)
            .match(/[^a-z0-9]*$/)?.[0] || ""
        ).replace(/[“”‘’ ]/g, "");
        if (
          !line[i - 1] ||
          ([".", "!", "?"].includes(pre[pre.length - 1]!) &&
            !pre.endsWith(". . ."))
        ) {
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
          line[i]!.quote = line[i]!.quote || true;
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
          const post = next.text.match(/^[^a-z0-9’]*”|^[^a-z0-9”]*’/)?.[0];
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
  const quotedIndices = [
    ...new Set(quoted.flatMap((q) => [q.start, q.end])),
  ].sort((a, b) => a - b);
  let currentIndex = 0;
  const lines = para.parts.map((line) => {
    const res: {
      text: string;
      quoted: number;
      quote?: true | { section: number; paragraph: number };
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
              currentIndex + prev >= q.start && currentIndex + index <= q.end
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
};

const semiToRender = (
  section: Section,
  paras: SemiRenderContent[]
): RenderContent[] => {
  const paraIds = getParagraphIds(section);
  const allQuotes: any[] = paras.map(
    (para): { section: number; paragraph: number } | null => {
      if (para.type === "break") return null;
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
      if (allQuotes.length === 1) return allQuotes[0];
      return null;
    }
  );
  allQuotes.slice(0, -1).forEach((q, i) => {
    if (
      q &&
      allQuotes[i + 1] &&
      allQuotes[i + 1].section === q.section &&
      allQuotes[i + 1].paragraph === q.paragraph + 1
    ) {
      allQuotes[i + 1].start =
        allQuotes[i].start === undefined
          ? allQuotes[i].paragraph
          : allQuotes[i].start;
      allQuotes[i] = true;
    }
  });

  return paras.map((para, paraIndex) => {
    if (para.type === "break") return para;
    if (para.parts.every((line) => line.every((part) => part.quote))) {
      if (allQuotes[paraIndex]) {
        return {
          ...para,
          parts: para.parts.map((line) =>
            line.map((part) => ({ ...part, quote: true }))
          ),
          paragraph: paraIds[paraIndex]!,
          quote:
            allQuotes[paraIndex] === true
              ? allQuotes[paraIndex]
              : getUrlPath(allQuotes[paraIndex]),
          quoted: [
            ...new Set(
              section.quoted?.[paraIndex]?.map((q) =>
                JSON.stringify(getUrlPath(q))
              )
            ),
          ].map((x) => JSON.parse(x)),
        };
      }
    }
    return {
      ...para,
      parts: para.parts.map((lines) =>
        lines.map((part) => ({
          ...part,
          quote:
            part.quote && (part.quote === true ? true : getUrlPath(part.quote)),
        }))
      ),
      paragraph: paraIds[paraIndex]!,
      quoted: [
        ...new Set(
          section.quoted?.[paraIndex]?.map((q) => JSON.stringify(getUrlPath(q)))
        ),
      ].map((x) => JSON.parse(x)),
    };
  });
};

interface Match {
  section: number;
  paragraph: number;
  score: number;
  level: number;
}

const escapeForRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const searchInfo: Record<string, Match[]> = {};
const getSearchInfo = (tokens: string[]) =>
  tokens.flatMap((token) => {
    if (!token) return [];
    if (searchInfo[token]) return searchInfo[token];
    const searchLine = baseSearch.match(
      new RegExp(`^${escapeForRegex(token)}=.*`, "m")
    );
    if (searchLine) {
      const [_, info, count] = searchLine[0].split("=");
      const matches = info!.split(",").map((p) => {
        const [p2, level] = p.split("|");
        const [key, score] = p2!.split("_");
        const [sectionIndex, paraIndex] = key!.split(":");
        return {
          section: parseInt(sectionIndex!, 10),
          paragraph: parseInt(paraIndex!, 10),
          score: score === undefined ? 2 : parseInt(score, 10),
          level: level === undefined ? 0 : parseInt(level, 10),
        };
      });
      searchInfo[token] = matches;
    } else {
      searchInfo[token] = [];
    }
    return searchInfo[token];
  });

const collapseSingleKeys = (
  tree: any,
  maxDepth: number
): [[string, string][], any] => {
  const path: [string, string][] = [];
  let current = tree;
  while (path.length < maxDepth) {
    const keys = Object.keys(current);
    if (keys.length !== 1) break;
    const [title, url] = JSON.parse(keys[0]!);
    path.push([title, `${(path[path.length - 1] || [])[1] || ""}/${url}`]);
    current = current[keys[0]!];
  }
  return [path, current];
};

const getData = (
  search: string,
  ...urlPath: string[]
): { data: RenderSection[]; path: [string, string][]; tree: any } => {
  const showContent =
    data.find(
      (d) =>
        urlPath.length === d.path.length &&
        urlPath.every((p, i) => d.path[i]![1] === p)
    ) ||
    [
      "bahaullah/hidden-words",
      "bahaullah/gleanings-writings-bahaullah",
    ].includes(urlPath.join("/")) ||
    (urlPath.length > 1 &&
      ["documents", "ruhi", "compilations"].includes(urlPath[0]!)) ||
    (urlPath.length > 2 && urlPath[1] === "bahaullah-new-era");

  const tokens = search
    .split(/( |—)/)
    .map((word) =>
      stem(
        word
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/’s$/g, "")
          .replace(/[^a-z0-9]/g, "")
      )
    )
    .filter((t) => t);
  const searchInfo = getSearchInfo(tokens);

  const filtered = dataWithIndices.filter(
    ({ section, index }) =>
      !section.meta &&
      urlPath.every((p, i) => section.path[i]?.[1] === p) &&
      (tokens.length === 0 || searchInfo.some((m) => m.section === index))
  );

  const tree = {} as any;
  for (const { section } of filtered) {
    section.path.reduce((res, p) => {
      const key = JSON.stringify([p[0], p[1]]);
      return (res[key] = res[key] || {});
    }, tree);
  }
  const [path, nestedTree] = collapseSingleKeys(tree, urlPath.length);

  if (!showContent) {
    return { data: [], path, tree: nestedTree };
  }

  const result = filtered.map(({ section, index }) => {
    const content = semiToRender(
      section,
      section.content.map(
        (c, paraIndex): SemiRenderContent =>
          contentToSemi(c, (section.quoted || {})[paraIndex] || [])
      )
    )
      .map((para, paraIndex) => {
        if (para.type === "break") return para;
        const match = searchInfo.find(
          (s) => s.section === index && s.paragraph === paraIndex
        );
        if (!match) return para;
        const lines = para.parts.map((line) => {
          const res = [];
          for (const part of line) {
            if (part.quoted >= match.level) {
              res.push(part);
            } else if (res[res.length - 1] !== null) {
              res.push(null);
            }
          }
          if (res.length === 1 && res[0] === null) return [];
          return res;
        });
        let started = false;
        lines.forEach((line, i) => {
          if (line.length === 0) {
            if (started) {
              if (
                lines[i - 1]!.length > 0 &&
                lines[i - 1]![lines[i - 1]!.length - 1] !== null
              ) {
                lines[i - 1]!.push(null);
              }
            } else {
              if (lines[i + 1]!.length > 0 && lines[i + 1]![0] !== null) {
                lines[i + 1]!.unshift(null);
              }
            }
          } else {
            started = true;
          }
        });
        return {
          ...para,
          parts: lines
            .map((line) =>
              line.map((part, i) => {
                if (part !== null) return part;
                return {
                  text:
                    i === 0
                      ? ". . . "
                      : i === line.length - 1
                        ? " . . ."
                        : " . . . ",
                  quoted: 0,
                };
              })
            )
            .filter((line) => line.length > 0),
        };
      })
      .filter(
        (_, paraIndex) =>
          tokens.length === 0 ||
          searchInfo.some(
            (m) => m.section === index && m.paragraph === paraIndex
          )
      )
      .map((para) => {
        if (para.type === "break") return para;
        return {
          ...para,
          parts: para.parts.map((line) =>
            line.flatMap((part) => {
              const words = part.text.split(/( |—)/);
              const res = [{ ...part, text: "" }];
              for (const word of words) {
                const tidied = word
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
                  .replace(/’s$/g, "")
                  .replace(/[^a-z0-9]/g, "");
                const token = stem(tidied);
                if (token && tokens.includes(token)) {
                  res.push(
                    { ...part, text: word, highlight: true },
                    { ...part, text: "" }
                  );
                } else {
                  res[res.length - 1]!.text += word;
                }
              }
              return res.filter((r) => r.text);
            })
          ),
        };
      });
    return {
      ...section,
      content: content,
    };
  });
  return {
    data: result,
    path,
    tree: nestedTree,
  };
};

Bun.serve({
  port: 8000,
  routes: {
    "/api/:query": (req) => {
      const { path, search } = JSON.parse(req.params.query);
      const data = getData(search, ...path);
      const res = Response.json(data);
      res.headers.set("Access-Control-Allow-Origin", "*");
      res.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      return res;
    },
  },
});
