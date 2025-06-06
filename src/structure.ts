import fs from "fs-extra";

import sources from "./sources.js";
import { readText, writeJSON } from "./utils.js";

const urlAuthors = {
  "Bahá’u’lláh": "bahaullah",
  "The Báb": "the-bab",
  "‘Abdu’l-Bahá": "abdul-baha",
  "Shoghi Effendi": "shoghi-effendi",
  "The Universal House of Justice": "the-universal-house-of-justice",
} as Record<string, string>;

type SectionContent =
  | string
  | { text: string; type: "info" | "call" }
  | { text: string; lines: number[] };

export interface Section {
  path: [string, string, number][];
  years: [number, number];
  translated?: string;
  meta?: boolean;
  content: SectionContent[];
}

const getContentItem = (line: string): SectionContent => {
  if (line.startsWith("*")) {
    return { type: "info", text: line.slice(1).trim() };
  }
  if (line.startsWith("^")) {
    return { type: "call", text: line.slice(1).trim() };
  }
  if (line.startsWith(">")) {
    const lines = line.split("\n").map((t) => t.slice(2));
    return {
      text: lines.join(" "),
      lines: lines
        .map((l) => l.length + 1)
        .reduce((res, i) => [...res, res[res.length - 1]! + i], [0]),
    };
  }
  return line;
};

export const parseStructuredSections = (
  file: string,
  inputText: string
): Section[] => {
  const lines = inputText.split(/\n\n/);
  const sections: Section[] = [];
  const currentPath: [string, string, number][] = [];
  const counters: number[] = [];
  const metaStack: any[] = [];

  let lastLevel = 0;

  for (const line of lines) {
    let level: number | null = null;
    let title: string = "";

    if (lastLevel === 0) {
      level = 1;
      title = line;
    } else {
      const headerMatch = line.match(/^(#+)(.*)/s);
      if (headerMatch) {
        level = headerMatch[1]!.length + 1;
        title = headerMatch[2]!.trim();
      } else if (line === "***") {
        level = lastLevel + 1;
        title = "*";
      }
    }

    if (level !== null) {
      const [base, ...parts] = title.split(/\n/g);
      const { translated, ...meta } = parts.reduce((res, m) => {
        const [key, value = "true"] = m.split("=");
        return { ...res, [key!]: JSON.parse(value) };
      }, {} as any);

      counters.splice(level);
      counters[level - 1] = (counters[level - 1] || 0) + 1;

      currentPath.splice(level - 1);
      currentPath[level - 1] = [
        base || `${counters[level - 1]}`,
        lastLevel === 0
          ? file
          : base
              ?.toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z ]/g, "")
              .replace(/ /g, "-") || `${counters[level - 1]}`,
        counters[level - 1]!,
      ];

      metaStack.splice(level);
      metaStack[level] = meta;
      const sectionMeta = metaStack.reduce((res, m) => ({ ...res, ...m }), {});

      sections.push({
        path: [
          [sectionMeta.author, urlAuthors[sectionMeta.author], 0],
          ...currentPath,
        ],
        translated,
        ...sectionMeta,
        author: undefined,
        content: [],
      });

      if (title) lastLevel = level;
    } else {
      sections[sections.length - 1]!.content.push(getContentItem(line));
    }
  }

  return sections.filter((s) => s.content.length > 0);
};

(async () => {
  fs.emptyDirSync("./data/structure");

  for (const author of Object.keys(sources)) {
    await Promise.all(
      Object.keys(sources[author]!).map(async (file) => {
        const id = `${author}-${file}`;
        await writeJSON(
          "structure",
          id,
          parseStructuredSections(file, await readText("format", id))
        );
      })
    );
  }
})();
