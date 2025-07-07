import stem from "../utils/searchStem";
import fixSpellings from "../utils/spellings";
import type { Range } from "../utils/types";
import { sum } from "../utils/utils";

import lengthsJSON from "../data/lengths.json";
import searchIndex from "../data/search.txt";

const K = 1.2; // term saturation, low k more like binary presence of terms
const B = 0.3; // length normalisation 0-1, 0 = long & short treated the same
const L = 0.6; // level lowering factor

type Layers = { level: number; value: number }[];

const splitLayers = (layers: string, defValue: number): Layers =>
  layers
    ? layers.split(",").map((l) => {
        const [level, value] = l.split("=");
        return { level: parseInt(level!, 10), value: parseInt(value!, 10) };
      })
    : [{ level: 0, value: defValue }];

const parasTotal: number = (lengthsJSON as any).total;
const parasAverage: number = (lengthsJSON as any).average;

const parasLengths: (string | Layers)[][] = (lengthsJSON as any).lengths;
const getParaLength = (section: number, paragraph: number, level: number) => {
  if (typeof parasLengths[section]![paragraph]! === "string") {
    parasLengths[section]![paragraph]! = splitLayers(
      parasLengths[section]![paragraph]!,
      1
    );
  }
  const result = parasLengths[section]![paragraph]! as Layers;
  return result.find((x) => x.level >= level)!.value;
};

const escapeForRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const tokenMatches: Record<
  string,
  { token: string; section: number; paragraph: number; matches: Layers }[]
> = {};
const getTokenMatches = (
  token: string
): { token: string; section: number; paragraph: number; matches: Layers }[] => {
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
          section: parseInt(section!, 10),
          paragraph: parseInt(paragraph!, 10),
          matches: splitLayers(layers.join(","), 1),
        };
      });
    }
  }
  return tokenMatches[token];
};

const lengthIdfs: Record<number, number> = {};
const getTokenIdf = (token: string) => {
  const tokenTotal = getTokenMatches(token).length;
  if (!lengthIdfs[tokenTotal]) {
    lengthIdfs[tokenTotal] = Math.log(
      (parasTotal - tokenTotal + 0.5) / (tokenTotal + 0.5) + 1
    );
  }
  return lengthIdfs[tokenTotal];
};

const trailingMatchLength = <T>(array: T[], test: (item: T) => boolean) => {
  let count = 0;
  for (let i = array.length - 1; i >= 0; i--) {
    if (!test(array[i]!)) break;
    count++;
  }
  return count;
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

  const allSections = [...new Set(matches.map((m) => m.section))];
  const groups = allSections.flatMap((section) => {
    const sectionMatches = matches.filter((m) => m.section === section);
    const paras = parasLengths[section]!.map((_, paragraph) => {
      const paraMatches = sectionMatches.filter(
        (m) => m.paragraph === paragraph
      );
      const paraLevel =
        paraMatches.length === 0
          ? 0
          : Math.floor(Math.min(...paraMatches.map((m) => m.level)) * L);
      const paraLength = getParaLength(section, paragraph, paraLevel);
      return {
        level: paraLevel,
        length: paraLength,
        scores: tokens
          .map((token) => ({
            token,
            score: sum(
              paraMatches.filter((m) => m.token === token).map((m) => m.value)
            ),
          }))
          .filter((s) => s.score > 0),
        done: false,
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
          if (paras[end]!.done) {
            break;
          }
          const sliced = paras.slice(start, end + 1);
          if (trailingMatchLength(sliced, (x) => x.scores.length === 0) > 3) {
            break;
          }
          const length = sum(sliced.map((p) => p.length)) / parasAverage;
          const score = sum(
            tokens.map((token) => {
              const tf = sum(
                sliced.map(
                  (p) => p.scores.find((s) => s.token === token)?.score || 0
                )
              );
              return (
                ((tf * (K + 1)) / (tf + K * (1 - B + B * length))) *
                getTokenIdf(token)
              );
            })
          );
          if (score > 0 && (!best || score > best.score)) {
            best = { start, end, score };
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
            paras[paragraph]!.scores.length === 0
              ? null
              : paras[paragraph]!.level
          ),
          score: best.score,
        });
        for (const paragraph of indices) {
          paras[paragraph]!.done = true;
        }
      } else {
        break;
      }
    }
    return grouped;
  });

  return { tokens, matches: groups.sort((a, b) => b.score - a.score) };
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
