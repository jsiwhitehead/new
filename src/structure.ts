import fs from "fs-extra";

import sources from "./sources.js";
import { readText, writeJSON } from "./utils.js";
import { doc } from "prettier";

const authorYears = {
  "The Báb": [1844, 1853],
  "Bahá’u’lláh": [1853, 1892],
  "‘Abdu’l‑Bahá": [1892, 1921],
  "Shoghi Effendi": [1921, 1957],
  "The Universal House of Justice": [1963, 3000],
} as Record<string, [number, number]>;

const indexAuthors = {
  "Bahá’u’lláh": 1,
  "The Báb": 2,
  "‘Abdu’l‑Bahá": 3,
  Prayers: 4,
  "Shoghi Effendi": 5,
  "The Universal House of Justice": 6,
  Documents: 7,
  Compilations: 8,
  Books: 9,
} as Record<string, number>;

const urlAuthors = {
  "Bahá’u’lláh": "bahaullah",
  "The Báb": "the-bab",
  "‘Abdu’l‑Bahá": "abdul-baha",
  Prayers: "prayers",
  "Shoghi Effendi": "shoghi-effendi",
  "The Universal House of Justice": "the-universal-house-of-justice",
  Documents: "documents",
  Compilations: "compilations",
  Books: "books",
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
  prayer?: string;
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

const additional: Section[] = [];
const prayers: Section[] = [];
const messages: Section[] = [];

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
      if (sectionPath[2]?.[1] === "social-action-osed") {
        sectionPath.splice(1, 1);
      }
      if (sectionPath[0]![1] === "documents") {
        const documentsOrder = [
          "Bahá’u’lláh",
          "Century of Light",
          "One Common Faith",
          "The Kitáb‑i‑Aqdas: Its Place in Bahá’í Literature",
          "31 May 2024 (ITC)",
          "3 May 2018 (ITC)",
          "Training Institutes: Attaining a Higher Level of Functioning (ITC)",
          "Insights from the Frontiers of Learning (ITC)",
          "Message on clusters, institutes, and growth (ITC)",
          "Intensive growth (ITC)",
          "Bahá’í scholarship: importance, nature, and promotion of (ITC)",
          "Social Action (OSED)",
          "Promoting Entry by Troops (RD)",
          "The Prosperity of Humankind (BIC)",
          "Turning Point for All Nations (BIC)",
          "Youth Conference Materials (WC)",
          "Conservation of the Earth’s Resources (WC)",
        ];
        sectionPath[1]![2] = documentsOrder.indexOf(sectionPath[1]![0]) + 1;
      }

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

  return sections.filter((s) => {
    if (s.content.length === 0) return false;
    if (s.prayer) {
      prayers.push(s);
      return false;
    }
    if (s.path[1]![0] === "Additional") {
      additional.push(s);
      return false;
    }
    if (
      s.path[0]![0] === "Shoghi Effendi" &&
      [
        "Bahá’í Administration",
        "Citadel of Faith",
        "This Decisive Hour",
      ].includes(s.path[1]![0]) &&
      s.path[2]?.[0] !== "In Memoriam"
    ) {
      messages.push(s);
      return false;
    }
    return true;
  });
};

const getLength = (c: SectionContent) => {
  if (typeof c === "string") return c.length;
  if ("type" in c) {
    if (c.type === "break") return 0;
    return c.text.length;
  }
  if (Array.isArray(c)) return 0;
  return c.text.length;
};

(async () => {
  fs.emptyDirSync("./data/structure");

  for (const author of Object.keys(sources)) {
    await Promise.all(
      Object.keys(sources[author]!).map(async (file, fileIndex) => {
        const id = `${author}-${file}`;
        const res = parseStructuredSections(
          file,
          fileIndex,
          await readText(
            sources[author]![file]!.length > 0 ? "format" : "manual",
            id
          )
        );
        if (res.length > 0) {
          await writeJSON("structure", id, res);
        }
      })
    );
  }

  additional.sort(
    (a, b) =>
      a.content.map((x) => getLength(x)).reduce((res, x) => res + x, 0) -
      b.content.map((x) => getLength(x)).reduce((res, x) => res + x, 0)
  );
  prayers.sort(
    (a, b) =>
      a.content.map((x) => getLength(x)).reduce((res, x) => res + x, 0) -
      b.content.map((x) => getLength(x)).reduce((res, x) => res + x, 0)
  );
  messages.sort((a, b) => a.years[0] - b.years[0]);

  let indices = {
    "The Báb": 1,
    "Bahá’u’lláh": 1,
    "‘Abdu’l‑Bahá": 1,
    "Shoghi Effendi": 1,
    "The Universal House of Justice": 1,
  } as Record<string, number>;
  await writeJSON(
    "structure",
    "additional",
    additional.map((x) => {
      x.path = [
        x.path[0]!,
        ["Additional", "additional", 0],
        [
          `${indices[x.path[0]![0]]}`,
          `${indices[x.path[0]![0]]}`,
          indices[x.path[0]![0]]!,
        ],
      ];
      x.id = `${x.path[0]![2]}/0/${indices[x.path[0]![0]]}`;
      indices[x.path[0]![0]]!++;
      return x;
    })
  );
  let index = 1;
  await writeJSON(
    "structure",
    "prayers",
    prayers.map((x) => {
      x.prayer = x.path[0]![0];
      x.path = [
        ["Prayers", "prayers", indexAuthors["Prayers"]!],
        [`${index}`, `${index}`, index],
      ];
      x.id = `${0}/${index}`;
      index++;
      return x;
    })
  );
  let currentMessage = "";
  index = 0;
  await writeJSON(
    "structure",
    "shoghi-effendi-messages",
    messages.map((x) => {
      x.path = [
        x.path[0]!,
        ["Selected Messages", "messages", 1],
        ...x.path.slice(x.path[1]![0] === "Citadel of Faith" ? 3 : 2),
      ];
      if (x.path[2]![0] !== currentMessage) {
        currentMessage = x.path[2]![0];
        index++;
      }
      x.path[2] = [x.path[2]![0], x.path[2]![1], index];
      x.id = x.path.map((y) => y[2]).join("/");
      return x;
    })
  );
})();
