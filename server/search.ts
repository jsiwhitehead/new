import { readText } from "../utils/files.ts";
import stem, { isStopword } from "../utils/searchStem.ts";
import fixSpellings from "../utils/spellings.ts";
import type { Passage, Range } from "../utils/types.ts";
import { doRangesIntersect, sum } from "../utils/utils.ts";

import infoJSON from "../data/info.json" with { type: "json" };
const searchIndex = await readText("", "search");

type Lengths = { level: number; length: number }[];
type Positions = { level: number; positions: number[] };

const K = 1.2; // term saturation, low k more like binary presence of terms
const B = 0.6; // length normalisation 0-1, 0 = long & short treated the same
const P = 0.2; // proximity weight factor
const L = 0.6; // level lowering factor

const getMinSpan = (positions: number[][]) => {
  const pointers: number[] = Array(positions.length).fill(0);
  let minSpan = Infinity;

  while (true) {
    const currentPositions = pointers.map((p, i) => positions[i]![p]!);
    const currentMin = Math.min(...currentPositions);
    const currentMax = Math.max(...currentPositions);
    const span = currentMax - currentMin + 1;

    if (span < minSpan) minSpan = span;

    let minIndex = -1;
    let minValue = Infinity;
    for (let i = 0; i < positions.length; i++) {
      if (positions[i]![pointers[i]!]! < minValue) {
        minValue = positions[i]![pointers[i]!]!;
        minIndex = i;
      }
    }

    pointers[minIndex]!++;
    if (pointers[minIndex]! >= positions[minIndex]!.length) break;
  }

  return minSpan;
};

const parasTotal: number = (infoJSON as any).total;
const parasAverage: number = (infoJSON as any).average;
const dateFactors: Record<number, number> = (infoJSON as any).dates;

const parasLengths: (string | Lengths)[][] = (infoJSON as any).lengths;
const getParaLength = (section: number, paragraph: number, level: number) => {
  if (typeof parasLengths[section]![paragraph]! === "string") {
    parasLengths[section]![paragraph]! = (
      parasLengths[section]![paragraph]! || "0=1"
    )
      .split(",")
      .map((l) => {
        const [level, value] = l.split("=");
        return { level: parseInt(level!, 10), length: parseInt(value!, 10) };
      });
  }
  const result = parasLengths[section]![paragraph]! as Lengths;
  return result.find((x) => x.level >= level)!.length;
};

const escapeForRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const tokenMatches: Record<
  string,
  {
    token: string;
    stopword: boolean;
    section: number;
    paragraph: number;
    matches: Positions[];
  }[]
> = {};
const getTokenMatches = ({
  token,
  stopword,
}: {
  token: string;
  stopword: boolean;
}): {
  token: string;
  stopword: boolean;
  section: number;
  paragraph: number;
  matches: Positions[];
}[] => {
  if (!tokenMatches[token]) {
    const line = searchIndex.match(
      new RegExp(`^${escapeForRegex(token)}_.*`, "m")
    );
    if (!line) {
      tokenMatches[token] = [];
    } else {
      const [_, info] = line[0].split("_");
      tokenMatches[token] = info!.split("|").map((s) => {
        const [key, ...layers] = s.split(",");
        const [section, paragraph] = key!.split(":");
        return {
          token,
          stopword,
          section: parseInt(section!, 10),
          paragraph: parseInt(paragraph!, 10),
          matches: layers.map((l) => {
            const [level, positions] = l.split("=");
            return {
              level: parseInt(level!, 10),
              positions: positions!.split("-").map((p) => parseInt(p, 10)),
            };
          }),
        };
      });
    }
  }
  return tokenMatches[token];
};

const lengthIdfs: Record<number, number> = {};
const getTokenIdf = (token: string) => {
  const tokenTotal = getTokenMatches({ token, stopword: false }).length;
  if (!lengthIdfs[tokenTotal]) {
    lengthIdfs[tokenTotal] = Math.log(
      (parasTotal - tokenTotal + 0.5) / (tokenTotal + 0.5) + 1
    );
  }
  return lengthIdfs[tokenTotal];
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
        .map((word) => word.replace(/’s$/g, "").replace(/[^a-z0-9]/g, ""))
        .filter((word) => word)
        .map((word) => ({
          token: stem(word),
          stopword: isStopword(word),
        }))
    ),
  ];
  if (tokens.filter((x) => !x.stopword).length === 0) return null;

  const matches = tokens
    .flatMap((token) => getTokenMatches(token))
    .filter(
      (m) =>
        sections.includes(m.section) && m.matches.find((s) => s.level >= level)
    )
    .map(({ matches, ...m }) => ({
      ...m,
      ...matches.find((s) => s.level >= level)!,
    }));

  const sectionMatches: Record<
    string,
    {
      section: number;
      paragraph: number;
      token: string;
      stopword: boolean;
      level: number;
      positions: number[];
    }[]
  > = {};
  for (const m of matches) {
    sectionMatches[m.section] = sectionMatches[m.section] || [];
    sectionMatches[m.section]!.push(m);
  }
  const runs = [
    ...new Set(matches.filter((x) => !x.stopword).map((m) => m.section)),
  ].flatMap((section) => {
    const paras = parasLengths[section]!.map((_, paragraph) => {
      const paraAllMatches = sectionMatches[section]!.filter(
        (m) => m.paragraph === paragraph
      );
      const paraMatches = paraAllMatches.filter((m) => !m.stopword);
      const paraLevel =
        paraMatches.length === 0
          ? 0
          : Math.max(
              level,
              Math.round(Math.min(...paraMatches.map((m) => m.level)) * L)
            );
      const paraLength = getParaLength(section, paragraph, paraLevel);
      if (paraMatches.length === 0) {
        return {
          level: null,
          length: paraLength,
          scores: {} as Record<string, number>,
          proximity: 0,
          done: false,
        };
      }
      const proxTokens = tokens
        .map(({ token }) => ({
          token,
          positions: paraAllMatches
            .filter((m) => m.token === token)
            .flatMap((m) => m.positions),
        }))
        .filter((x) => x.positions.length > 0);
      return {
        level: paraLevel,
        length: paraLength,
        scores: tokens.reduce<Record<string, number>>((res, { token }) => {
          const score = sum(
            paraMatches
              .filter((m) => m.token === token)
              .map((m) => m.positions.length * (m.level * 3 + 1))
          );
          if (score === 0) return res;
          return { ...res, [token]: score };
        }, {}),
        proximity:
          proxTokens.length > 1
            ? Math.pow(sum(proxTokens.map((x) => getTokenIdf(x.token))), 2) /
              getMinSpan(proxTokens.map((x) => x.positions))
            : 0,
        done: false,
      };
    });

    const firstPara = paras.findIndex((x) => x.level !== null);
    const lastPara = paras.findLastIndex((x) => x.level !== null);

    let allRuns: {
      start: number;
      end: number;
      levels: (number | null)[];
      score: number;
      scoreInfo: any;
    }[] = [];
    for (let start = firstPara; start <= lastPara; start++) {
      if (paras[start]!.level === null) continue;
      let gap = 0;
      for (let end = start; end <= lastPara; end++) {
        if (paras[end]!.level === null) gap++;
        else gap = 0;
        if (gap > 3) break;
        if (paras[end]!.level !== null) {
          const sliced = paras.slice(start, end + 1);
          const length = sum(sliced.map((p) => p.length)) / parasAverage;
          const tfIdf = sum(
            tokens
              .filter((x) => !x.stopword)
              .map(({ token }) => {
                const tf = sum(sliced.map((p) => p.scores[token] || 0));
                return (
                  ((tf * (K + 1)) / (tf + K * (1 - B + B * length))) *
                  getTokenIdf(token)
                );
              })
          );
          const proximity = Math.max(...sliced.map((p) => p.proximity));
          const score = (tfIdf + P * proximity) * (dateFactors[section] || 1);
          const levels: (number | null)[] = [];
          for (let paragraph = start; paragraph <= end; paragraph++) {
            levels.push(
              paras[paragraph]!.scores.length === 0
                ? null
                : paras[paragraph]!.level
            );
          }
          allRuns.push({
            start,
            end: end + 1,
            levels,
            score,
            scoreInfo: { tfIdf, proximity },
          });
        }
      }
    }

    const result: Passage[] = [];
    while (allRuns.length > 0) {
      const maxScore = Math.max(...allRuns.map((x) => x.score));
      const best = allRuns.find((x) => x.score === maxScore)!;
      result.push({
        section,
        start: best.start,
        levels: best.levels,
        score: best.score,
        scoreInfo: best.scoreInfo,
      });
      allRuns = allRuns.filter((x) => !doRangesIntersect(x, best));
    }
    return result;
  });

  return {
    tokens: tokens.map((x) => x.token),
    matches: runs.sort((a, b) => b.score - a.score),
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
