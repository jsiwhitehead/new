import type {
  FlatPara,
  Quote,
  Range,
  Ref,
  RefQuote,
  SectionContent,
} from "../utils/types.ts";
import {
  doesRangeInclude,
  doRangesIntersect,
  getIndices,
  getQuoteText,
  getRangesIntersect,
  mapRanges,
  moveRange,
  textIsConnector,
} from "../utils/utils.ts";

import { data, getAllSpecial } from "./utils.ts";

const getParaBase = (para: SectionContent, allSpecial: boolean): FlatPara => {
  const base = { quoted: [], highlights: [], sourceQuotes: [], allSpecial };
  if (typeof para === "string") return { text: para, ...base };
  if (!Array.isArray(para)) return { text: "", ...para, ...base };
  const parts = para.map((part) => {
    if (typeof part === "string") return { text: part };
    return { text: getQuoteText(data, part), quote: part };
  });
  let current = 0;
  const res: FlatPara = { text: "", quotes: [], ...base };
  for (const { text, quote } of parts) {
    res.text += text;
    if (quote) {
      res.quotes!.push({
        range: { start: current, end: current + text.length },
        quote,
      });
    }
    current += text.length;
  }
  return res;
};
export const getPara = (ref: Ref, allSpecial: boolean): FlatPara => {
  const para = data[ref.section]!.content[ref.paragraph]!;
  const res = getParaBase(para, allSpecial);
  const range = { start: 0, end: res.text.length };
  res.sourceQuotes = [{ range, quote: { ...ref, ...range } }];
  return res;
};

const slicePara = (para: FlatPara, part: Range): FlatPara => ({
  type: para.type,
  text: para.text.slice(part.start, part.end),
  lines: para.lines
    ?.filter((x) => doesRangeInclude(part, x))
    .map((x) => x - part.start),
  quotes: para.quotes
    ?.filter((q) => doRangesIntersect(q.range, part))
    .map((q) => {
      const range = getRangesIntersect(q.range, part)!;
      return {
        range: moveRange(range, -part.start),
        quote: {
          ...q.quote,
          ...moveRange(range, q.quote.start - q.range.start),
        },
      };
    }),
  quoted: para.quoted
    .filter((q) => doRangesIntersect(q.range, part))
    .map((q) => {
      const range = getRangesIntersect(q.range, part)!;
      return {
        range: moveRange(range, -part.start),
        quote: {
          ...q.quote,
          ...moveRange(range, q.quote.start - q.range.start),
        },
      };
    }),
  highlights: para.highlights
    .filter((q) => doRangesIntersect(q, part))
    .map((q) => moveRange(getRangesIntersect(q, part)!, -part.start)),
  sourceQuotes: para.sourceQuotes
    .filter((q) => doRangesIntersect(q.range, part))
    .map((q) => {
      const range = getRangesIntersect(q.range, part)!;
      return {
        range: moveRange(range, -part.start),
        quote: {
          ...q.quote,
          ...moveRange(range, q.quote.start - q.range.start),
        },
      };
    }),
  allSpecial: para.allSpecial,
});

const joinParaParts = (parts: (string | FlatPara)[]): FlatPara => {
  const paraParts = parts.filter((p) => typeof p !== "string");
  const types = [...new Set(paraParts.map((p) => p.type))];
  const allSpecials = [...new Set(paraParts.map((p) => p.allSpecial))];

  const res: FlatPara = {
    type: types.length === 1 ? types[0] : undefined,
    text: "",
    lines: [],
    quotes: [],
    quoted: [],
    highlights: [],
    sourceQuotes: [],
    allSpecial: allSpecials.length === 1 ? allSpecials[0]! : false,
  };

  let current = 0;
  for (const part of parts) {
    if (typeof part === "string") {
      res.text += part;
      current += part.length;
    } else {
      res.text += part.text;
      res.lines!.push(...(part.lines || []).map((x) => x + current));
      res.quotes!.push(
        ...(part.quotes || []).map((q) => ({
          range: moveRange(q.range, current),
          quote: q.quote,
        }))
      );
      res.quoted.push(
        ...part.quoted.map((q) => ({
          range: moveRange(q.range, current),
          quote: q.quote,
        }))
      );
      res.highlights.push(...part.highlights.map((q) => moveRange(q, current)));
      res.sourceQuotes.push(
        ...part.sourceQuotes.map((q) => ({
          range: moveRange(q.range, current),
          quote: q.quote,
        }))
      );
      current += part.text.length;
    }
  }

  res.lines = res.lines!.filter((x) => 0 < x && x < res.text.length);
  if (res.lines.length === 0) delete res.lines;

  if (res.quotes!.length > 0) delete res.lines;
  else delete res.quotes;

  if (res.quotes || res.lines) delete res.type;

  return res;
};

export const getFullQuotedPara = (paraBase: SectionContent): FlatPara => {
  const base = {
    quoted: [],
    highlights: [],
    sourceQuotes: [],
    allSpecial: false,
  };
  if (typeof paraBase === "string") return { text: paraBase, ...base };
  if (!Array.isArray(paraBase)) return { type: "break", text: "", ...base };
  const para = paraBase as (string | Quote)[];
  return joinParaParts(
    para.map((part) =>
      typeof part === "string"
        ? part
        : slicePara(
            getPara(part, getAllSpecial(data[part.section]!.content)),
            part
          )
    )
  );
};

export const filterQuoted = (
  para: FlatPara,
  quoted: RefQuote[],
  level: number
): FlatPara | null => {
  para.quoted = quoted;

  if (para.type === "break") return para;

  const indices = getIndices(
    para.text.length,
    para.quoted.map((q) => q.range)
  );
  const quotedParts = mapRanges(indices, (range) => ({
    range,
    quoted: para.quoted.filter((q) => doesRangeInclude(q.range, range)).length,
  }));

  const res: (null | { para: FlatPara; connector: boolean })[] = [];
  for (const { range, quoted } of quotedParts) {
    if (quoted >= level) {
      res.push({ para: slicePara(para, range), connector: false });
    } else if (textIsConnector(para.text.slice(range.start, range.end))) {
      if (res[res.length - 1]?.connector) {
        res[res.length - 1]!.para = joinParaParts([
          res[res.length - 1]!.para,
          slicePara(para, range),
        ]);
      } else {
        res.push({ para: slicePara(para, range), connector: true });
      }
    } else if (res[res.length - 1] !== null) {
      res.push(null);
    }
  }

  const mapped: (FlatPara | null)[] = [];
  res.forEach((x, i) => {
    if (x && (!x.connector || (res[i - 1] && res[i + 1]))) {
      mapped.push(x.para);
    } else if (mapped[mapped.length - 1] !== null) {
      mapped.push(null);
    }
  });

  if (mapped.every((p) => p === null)) return null;

  const parts = mapped.map((p, i) => {
    if (p !== null) return p;
    if (i === 0) return ". . . ";
    if (i === mapped.length - 1) return " . . .";
    return " . . . ";
  });

  return joinParaParts(parts);
};
