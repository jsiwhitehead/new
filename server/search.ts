import stem from "../utils/searchStem";
import type { Range, Ref } from "../utils/types";
import {
  fixSpellings,
  refsEqual,
  SCORE_BASE,
  uniqueRefs,
} from "../utils/utils";

import searchIndex from "../data/search.txt";
import paraLengths from "../data/lengths.json";

interface Match {
  ref: Ref;
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
      const [section, paragraph] = key!.split(":");
      return {
        ref: {
          section: parseInt(section!, 10),
          paragraph: parseInt(paragraph!, 10),
        },
        scores:
          levelCounts.length > 0
            ? levelCounts.map((l) => {
                const [level, score] = l.split("=");
                return {
                  level: parseInt(level!, 10),
                  score: parseInt(score!, 10),
                };
              })
            : [{ level: 0, score: SCORE_BASE }],
      };
    });
    searchInfo[token] = { matches, count: parseInt(count!, 10) };
  }
  return searchInfo[token];
};

export const getMatches = (
  sections: number[],
  search: string,
  level: number
) => {
  const tokens = [
    ...new Set(
      fixSpellings(search)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .split(/[‑— ]+/g)
        .map((word) => stem(word.replace(/’s$/g, "").replace(/[^a-z0-9]/g, "")))
        .filter((s) => s)
    ),
  ];
  if (tokens.length === 0) return null;

  const tokensMatches: Record<string, Match[]> = tokens.reduce(
    (res, token) => ({ ...res, [token]: getTokenInfo(token).matches }),
    {}
  );

  const matches = tokens.flatMap((token) =>
    tokensMatches[token]!.filter(
      (m) =>
        sections.includes(m.ref.section) &&
        m.scores.some((s) => s.level >= level)
    ).map(({ ref, scores }) => ({
      token,
      ref,
      ...scores.find((s) => s.level >= level)!,
    }))
  );

  const refs = uniqueRefs(matches.map((m) => m.ref));
  return {
    tokens,
    refs: refs
      .map((ref) => {
        const refMatches = matches.filter((m) => refsEqual(m.ref, ref));
        const refLevel = Math.floor(
          Math.min(...refMatches.map((m) => m.level)) * 0.75
        );
        const length = paraLengths[ref.section]![ref.paragraph]!.split(",")
          .map((l) => {
            const [a, b] = l.split("=");
            return { level: parseInt(a!, 10), length: parseInt(b!, 10) };
          })
          .find((x) => x.level >= refLevel)!.length;
        const scores = refMatches.map((m) => {
          const tf = m.score / length;
          const idf = Math.log(
            paraLengths.length / (1 + tokensMatches[m.token]!.length)
          );
          return tf * idf;
        });
        return {
          ref,
          level: refLevel,
          score: scores.reduce((a, b) => a + b, 0),
        };
      })
      .sort((a, b) => b.score - a.score),
  };
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
