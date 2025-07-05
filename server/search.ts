import stem from "../utils/searchStem";
import type { Range } from "../utils/types";
import { fixSpellings } from "../utils/utils";

import searchIndex from "../data/search.txt";

interface Match {
  section: number;
  paragraph: number;
  scores: { level: number; score: number }[];
}

const escapeForRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const searchInfo: Record<string, { matches: Match[]; count: number }> = {};
const getTokenInfo = (token: string) => {
  if (searchInfo[token]) return searchInfo[token];
  const searchLine = searchIndex.match(
    new RegExp(`^${escapeForRegex(token)}_.*`, "m")
  );
  if (!searchLine) {
    searchInfo[token] = { matches: [], count: 0 };
  } else {
    const [_, info, count] = searchLine[0].split("_");
    const matches = info!.split("|").map((match) => {
      const [key, ...levelCounts] = match.split(",");
      const [sectionIndex, paraIndex] = key!.split(":");
      return {
        section: parseInt(sectionIndex!, 10),
        paragraph: parseInt(paraIndex!, 10),
        scores: levelCounts.map((l) => {
          const [level, score] = l.split("=");
          return { level: parseInt(level!, 10), score: parseInt(score!, 10) };
        }),
      };
    });
    searchInfo[token] = { matches, count: parseInt(count!, 10) };
  }
  return searchInfo[token];
};

export const getMatches = (search: string) => {
  const tokens = fixSpellings(search)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[‑— ]+/g)
    .map((word) => stem(word.replace(/’s$/g, "").replace(/[^a-z0-9]/g, "")))
    .filter((s) => s);
  return tokens.length === 0
    ? null
    : tokens.flatMap((token) => ({ token, ...getTokenInfo(token) }));
};

export const getTokenHighlights = (text: string, tokens: string[]): Range[] => {
  if (tokens.length === 0) return [];
  const highlights: Range[] = [];
  const words = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/([‑— ]+)/g)
    .filter((s) => s);
  let current = 0;
  for (const word of words) {
    const token = stem(word.replace(/’s$/g, "").replace(/[^a-z0-9]/g, ""));
    if (tokens.includes(token)) {
      highlights.push({ start: current, end: current + word.length });
    }
    current += word.length;
  }
  return highlights;
};
