import stem from "../utils/searchStem";
import type { Range, Ref } from "../utils/types";
import { fixSpellings, SCORE_BASE } from "../utils/utils";

import paraLengthsJSON from "../data/lengths.json";
import searchIndex from "../data/search.txt";

interface Match {
  ref: Ref;
  scores: { level: number; score: number }[];
}

const trailingMatchLength = <T>(array: T[], test: (item: T) => boolean) => {
  let count = 0;
  for (let i = array.length - 1; i >= 0; i--) {
    if (!test(array[i]!)) break;
    count++;
  }
  return count;
};

const paraLengths = paraLengthsJSON as (
  | string
  | { level: number; length: number }[]
)[][];
const getParaLength = (
  section: number,
  paragraph: number,
  level: number = 0
) => {
  if (typeof paraLengths[section]![paragraph]! === "string") {
    paraLengths[section]![paragraph]! = paraLengths[section]![paragraph]!.split(
      ","
    ).map((l) => {
      if (!l) return { level: 0, length: 0 };
      const [level, length] = l.split("=");
      return { level: parseInt(level!, 10), length: parseInt(length!, 10) };
    });
  }
  return paraLengths[section]![paragraph]!.find((x) => x.level >= level)!
    .length;
};

const escapeForRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const searchInfo: Record<string, { matches: Match[]; count: number }> = {};
const getTokenInfo = (token: string) => {
  if (!searchInfo[token]) {
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

  const tokensMatches: Record<string, { matches: Match[]; idf: number }> =
    tokens.reduce((res, token) => {
      const tokenMatches = getTokenInfo(token).matches;
      return {
        ...res,
        [token]: {
          matches: tokenMatches,
          idf: paraLengths.length / (1 + tokenMatches.length),
        },
      };
    }, {});

  const matches = tokens.flatMap((token) =>
    tokensMatches[token]!.matches.filter(
      (m) =>
        sections.includes(m.ref.section) &&
        m.scores.some((s) => s.level >= level)
    ).map(({ ref, scores }) => ({
      token,
      ref,
      ...scores.find((s) => s.level >= level)!,
    }))
  );

  const allSections = [...new Set(matches.map((m) => m.ref.section))];
  const result = allSections.flatMap((section) => {
    const sectionMatches = matches.filter((m) => m.ref.section === section);
    const paras = paraLengths[section]!.map((_, paragraph) => {
      const paraMatches = sectionMatches.filter(
        (m) => m.ref.paragraph === paragraph
      );
      const paraLevel =
        paraMatches.length === 0
          ? 0
          : Math.floor(Math.min(...paraMatches.map((m) => m.level)) * 0.75);
      const paraLength = getParaLength(section, paragraph, paraLevel);
      return {
        level: paraLevel,
        length: paraLength,
        score: paraMatches
          .map((m) => m.score * tokensMatches[m.token]!.idf)
          .reduce((a, b) => a + b, 0),
      };
    });

    const grouped: {
      section: number;
      start: number;
      levels: (number | null)[];
      score: number;
    }[] = [];
    while (true) {
      let best;
      for (let start = 0; start < paras.length; start++) {
        for (let end = start; end < paras.length; end++) {
          const sliced = paras.slice(start, end + 1);
          if (trailingMatchLength(sliced, (x) => x.score === 0) > 3) break;
          const score = sliced.map((p) => p.score).reduce((a, b) => a + b, 0);
          const length = sliced.map((p) => p.length).reduce((a, b) => a + b, 0);
          const computed = score / length;
          if (computed > 0 && (!best || computed > best.score)) {
            best = { start, end, score: computed };
          }
        }
      }
      if (best) {
        const indices = Array.from({ length: best.end - best.start + 1 }).map(
          (_, i) => best.start + i
        );
        grouped.push({
          section,
          start: best.start,
          levels: indices.map((paragraph) =>
            paras[paragraph]!.score > 0 ? paras[paragraph]!.level : null
          ),
          score: best.score,
        });
        for (const paragraph of indices) {
          paras[paragraph]!.score = 0;
        }
      } else {
        break;
      }
    }
    return grouped;
  });

  return { tokens, matches: result.sort((a, b) => b.score - a.score) };
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
