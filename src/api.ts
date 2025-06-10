import baseData from "../data/data.json";

const data = baseData as Section[];

import type { Section, SectionContent } from "./structure";

type RenderContent =
  | { type: "break" }
  | {
      type: "normal" | "info" | "call" | "framing" | "lines";
      parts: { text: string; quoted: number; quote: boolean }[][];
      // quote?: true;
      // | { quote: string; path: [string, string, number][]; paragraph: number }
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

const getParagraph = (
  para: SectionContent
):
  | { type: "break" }
  | {
      type: "normal" | "info" | "call" | "framing" | "lines";
      parts: { text: string; quote: boolean }[][];
    } => {
  const text = getText(para);
  if (!text) return { type: "break" };
  if (typeof para === "string") {
    return { type: "normal", parts: [[{ text, quote: false }]] };
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
            line.map((p: any) => ({ ...p, quote: true }))
          ),
        } as any;
      }
    }
    return {
      type: "normal",
      parts: [
        para.map((p) =>
          typeof p === "string"
            ? { text: p, quote: false }
            : { text: getQuote(p), quote: true }
        ),
      ],
    };
  }
  if ("type" in para) {
    return { type: para.type, parts: [[{ text, quote: false }]] };
  }
  return {
    type: "lines",
    parts: para.lines.slice(1).map((end, i) => [
      {
        text: text.slice(para.lines[i], end - 1),
        quote: false,
      },
    ]),
  };
};

const capitalised = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

// export type SectionContent =
//   | string
//   | { type: "break" }
//   | { text: string; type: "info" | "call" | "framing" }
//   | { text: string; lines: number[] }
//   | (
//       | string
//       | { section: string; paragraph: number; start: number; end: number }
//     )[];

export default function getData(...urlPath: string[]): RenderSection[] {
  return data
    .filter((d) => !d.meta && urlPath.every((p, i) => d.path[i]?.[1] === p))
    .map((d) => {
      const content = d.content.map((c, i): RenderContent => {
        const para = getParagraph(c);
        if (para.type === "break") return para;

        const quoted = (d.quoted || {})[i] || [];
        const quotedIndices = [
          ...new Set(quoted.flatMap((q) => [q.start, q.end])),
        ].sort((a, b) => a - b);

        let currentIndex = 0;
        const lines = para.parts.map((line) => {
          const res: { text: string; quoted: number; quote: boolean }[] = [];
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

        const first = lines[0]![0]!;
        first.text = capitalised(first.text);

        for (const line of lines) {
          for (let i = 0; i < line.length; i++) {
            if (
              !line[i]!.quote &&
              (!line[i - 1] || line[i - 1]!.quote) &&
              (!line[i + 1] || line[i + 1]!.quote) &&
              !/[a-z0-9]/.test(
                line[i]!.text.normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
                  .replace(/\[[^\]]*\]/g, "")
              )
            ) {
              line[i]!.quote = true;
            }
          }
        }

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
        content,
      };
    });
}
