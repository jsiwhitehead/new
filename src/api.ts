import baseData from "../data/data.json";

const data = baseData as Section[];

import type { Section, SectionContent } from "./structure";

type RenderContent =
  | string
  | { text: string; type: "break" | "info" | "call" | "framing" }
  | { text: string; lines: number[] }
  | (
      | string
      | { quote: string; path: [string, string, number][]; paragraph: number }
    )[];

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
  if (!Array.isArray(c)) return c.text;
  return c.map((p) => (typeof p === "string" ? p : getQuote(p))).join("");
};

export default function getData(...urlPath: string[]): RenderSection[] {
  return data
    .filter((d) => !d.meta && urlPath.every((p, i) => d.path[i]?.[1] === p))
    .map((d) => {
      return {
        ...d,
        content: d.content.map((c) => {
          if (!Array.isArray(c)) return c;
          return c.map((p) => {
            if (typeof p === "string") return p;
            const source = data.find((d) => d.id === p.section)!;
            return {
              quote: getText(source.content[p.paragraph]!).slice(
                p.start,
                p.end
              ),
              path: source.path,
              paragraph: p.paragraph + 1,
            };
          });
        }),
      };
    });
}
