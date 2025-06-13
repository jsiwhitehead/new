import fs from "fs-extra";

import sources from "./sources.js";
import { readText, writeJSON } from "./utils.js";

const authorYears = {
  "The Báb": [1844, 1853],
  "Bahá’u’lláh": [1853, 1892],
  "‘Abdu’l‑Bahá": [1892, 1921],
  "Shoghi Effendi": [1921, 1957],
} as Record<string, [number, number]>;

const indexAuthors = {
  "Bahá’u’lláh": 1,
  "The Báb": 2,
  "‘Abdu’l‑Bahá": 3,
  "Shoghi Effendi": 4,
  "The Universal House of Justice": 5,
  "Commissioned by the Universal House of Justice": 6,
  "The Office of Social and Economic Development": 7,
  "Bahá’í International Community": 8,
} as Record<string, number>;

const urlAuthors = {
  "Bahá’u’lláh": "bahaullah",
  "The Báb": "the-bab",
  "‘Abdu’l‑Bahá": "abdul-baha",
  "Shoghi Effendi": "shoghi-effendi",
  "The Universal House of Justice": "the-universal-house-of-justice",
  "Commissioned by the Universal House of Justice":
    "commissioned-the-universal-house-of-justice",
  "The Office of Social and Economic Development":
    "office-social-economic-development",
  "Bahá’í International Community": "bahai-international-community",
} as Record<string, string>;

export type SectionContent =
  | string
  | { type: "break" }
  | { text: string; type: "info" | "call" | "framing" }
  | { text: string; lines: number[] }
  | (
      | string
      | { section: string; paragraph: number; start: number; end: number }
    )[];

export interface Section {
  id: string;
  path: [string, string, number][];
  years: [number, number];
  translated?: string;
  meta?: string;
  reference?: string;
  source?: string;
  summary?: string;
  prayer?: true;
  quoted?: Record<
    string,
    { start: number; end: number; section: string; paragraph: number }[]
  >;
  content: SectionContent[];
}

const getContentItem = (line: string): SectionContent => {
  if (line === "***") {
    return { type: "break" };
  }
  if (line.startsWith("*")) {
    return { type: "info", text: line.slice(1).trim() };
  }
  if (line.startsWith("^")) {
    return { type: "call", text: line.slice(1).trim() };
  }
  if (line.startsWith("@")) {
    return { type: "framing", text: line.slice(1).trim() };
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
  fileIndex: number,
  inputText: string
): Section[] => {
  const lines = inputText.split(/\n\n/);
  const sections: Section[] = [];
  const currentPath: [string, string, number][] = [];
  const counters: number[] = [fileIndex];
  const metaStack: any[] = [];

  let lastLevel = 0;

  for (const line of lines) {
    let level: number | null = null;
    let title: string = "";

    if (lastLevel === 0) {
      level = 1;
      title = line;
    } else {
      const headerMatch = line.match(/^(#+ ?)(.*)/s);
      if (headerMatch) {
        level = headerMatch[1]!.trim().length + 1;
        title = headerMatch[2]!;
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
          : (file === "summons-lord-hosts" && base === "Tablet of the Chief"
              ? base + ` (${translated})`
              : base
            )
              ?.toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9 ‑—]/g, "")
              .replace(/[^a-z0-9]/g, "-") || `${counters[level - 1]}`,
        counters[level - 1]!,
      ];
      if (translated) currentPath[level - 1]![0] += ` (${translated})`;

      metaStack.splice(level);
      metaStack[level] = meta;
      const sectionMeta = metaStack.reduce((res, m) => ({ ...res, ...m }), {});
      sectionMeta.years = sectionMeta.years || authorYears[sectionMeta.author];

      const sectionPath = [
        [
          sectionMeta.author,
          urlAuthors[sectionMeta.author],
          indexAuthors[sectionMeta.author],
        ],
        ...currentPath,
      ];

      sections.push({
        id: sectionPath.map((a: any) => a[2]).join("/"),
        path: sectionPath.filter(
          (p, i) =>
            !(
              [
                "gems-of-divine-mysteries",
                "the-book-of-certitude",
                "selections-writings-bab",
                "selections-from-the-writings-of-abdul-baha",
                "part-two-letters-from-shoghi-effendi",
                "century-of-light",
              ].includes(p[1]) ||
              (["light-of-the-world", "one-common-faith"].includes(p[1]) &&
                i === 2)
            )
        ),
        translated,
        ...sectionMeta,
        author: undefined,
        content: [],
      });
      if ((sections[sections.length - 1]?.prayer as any) === false) {
        delete sections[sections.length - 1]?.prayer;
      }

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
      Object.keys(sources[author]!).map(async (file, fileIndex) => {
        const id = `${author}-${file}`;
        await writeJSON(
          "structure",
          id,
          parseStructuredSections(file, fileIndex, await readText("format", id))
        );
      })
    );
  }
})();
