import type { Section, SectionContent } from "../utils/types.ts";

import baseData from "../data/data.json" with { type: "json" };
export const data = baseData as Section[];

interface Node {
  children: Record<string, Node>;
  indices: number[];
}

const treeData: Node = { children: {}, indices: [] };
data.forEach((section, index) => {
  if (!section.meta) {
    let node = treeData;
    node.indices.push(index);
    for (const [, value] of section.path) {
      if (!node.children[value]) {
        node.children[value] = { children: {}, indices: [] };
      }
      node = node.children[value];
      node.indices.push(index);
    }
  }
});

export const getAllSpecial = (content: SectionContent[]) =>
  content.every((para) => !Array.isArray(para) && typeof para !== "string");

const collectAllIndices = (node: any) => {
  let results = [...node.indices];
  for (const child of Object.values(node.children)) {
    results.push(...collectAllIndices(child));
  }
  return results;
};
export const getPathSections = (path: string[]) => {
  let node = treeData;
  for (const value of path) {
    node = node.children[value]!;
    if (!node) return [];
  }
  return node.indices;
};

export const getDocPath = (path: [string, string, number][]) => {
  if (path[1]?.[1]! === "additional") {
    return null;
  }
  if (
    [
      "kitab-i-iqan",
      "paris-talks",
      "tablets-divine-plan",
      "tablets-hague-abdul-baha",
      "twelve-table-talks-abdul-baha",
      "will-testament-abdul-baha",
      "promised-day-come",
      "the-institution-of-the-counsellors",
      "childrens-classes",
      "main-sequence",
      "hands-cause",
    ].includes(path[1]?.[1]!)
  ) {
    return path.slice(0, 2);
  }
  if (
    [
      "tablet-of-the-temple",
      "in-memoriam",
      "stories-of-bahaullah",
      "stories-of-some-notable-believers",
    ].includes(path[2]?.[1]!)
  ) {
    return path.slice(0, 3);
  }
  if (
    path.length >= 2 &&
    ["documents", "compilations"].includes(path[0]?.[1]!)
  ) {
    return path.slice(0, 2);
  }
  if (path.length >= 3 && ["ruhi"].includes(path[0]?.[1]!)) {
    return path.slice(0, 3);
  }
  if (
    path.length >= 3 &&
    [
      "bahai-sacred-writings",
      "promulgation-universal-peace",
      "some-answered-questions",
      "messages",
      "world-order-bahaullah",
      "god-passes-by",
      "additional-messages",
      "bahaullah-new-era",
    ].includes(path[1]?.[1]!)
  ) {
    return path.slice(0, 3);
  }
  return null;
};

export const getFilterSections = (path: string[]): number[] => {
  if (path.length === 2 && path[1] === "hidden-words") {
    return [
      ...getFilterSections([
        "bahaullah",
        "hidden-words",
        "part-one-from-the-arabic",
      ]),
      ...getFilterSections([
        "bahaullah",
        "hidden-words",
        "part-two-from-the-persian",
      ]),
    ];
  }
  const filtered = getPathSections(path);
  if (filtered.length === 1) return filtered;
  const docPath = getDocPath(path.map((p) => ["", p, 0]));
  if (!docPath) return [];
  return getPathSections(path);
};

export const getParagraphIds = (section: number) => {
  const path = data[section]!.path;
  const docPath = getDocPath(path) || path;
  const doc = getPathSections(docPath.map((p) => p[1]));

  let current = 0;
  let start = 0;
  const content = doc.flatMap((s) => {
    if (s === section) start = current;
    current += data[s]!.content.length;
    return data[s]!.content;
  });

  let currentMain = 1;
  let currentSpecial = 0;
  const allIds = content.map((para) => {
    if (typeof para === "string" || !("type" in para)) {
      currentSpecial = 0;
      return `${currentMain++}`;
    }
    return `${currentMain}${["a", "b", "c", "d", "e", "f", "g", "h", "i"][currentSpecial++]}`;
  });

  return allIds.slice(start, start + data[section]!.content.length);
};
