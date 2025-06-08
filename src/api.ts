import baseData from "../data/data.json";

const data = baseData as Section[];

import type { Section, SectionContent } from "./structure";

const getText = (c: SectionContent) => {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return "";
  return c.text;
};

export default function getData(...urlPath: string[]): Section[] {
  return data
    .filter((d) => !d.meta && urlPath.every((p, i) => d.path[i]?.[1] === p))
    .map((d) => {
      return {
        ...d,
        content: d.content.map((c) => {
          if (!Array.isArray(c)) return c;
          return c.map((p) => {
            if (typeof p === "string") return p;
            if ("section" in p) {
              return {
                quote: getText(
                  data.find((d) => d.id === p.section)?.content[p.paragraph]!
                ).slice(p.start, p.end),
              };
            }
            return p;
          });
        }),
      };
    });
}
