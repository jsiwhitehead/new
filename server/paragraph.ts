import type {
  FlatPara,
  Quote,
  Range,
  Ref,
  SectionContent,
} from "../utils/types";
import {
  doesRangeInclude,
  doRangesIntersect,
  getIndices,
  getQuoteText,
  getRangesIntersect,
  mapRanges,
  moveRange,
  refsEqual,
} from "../utils/utils";

import { data, getAllSpecial } from "./utils";

export const addSourceQuotes = (para: FlatPara, ref: Ref) => {
  para.sourceQuotes = [{ ...ref, start: 0, end: para.text.length }];
  return para;
};

export const getPara = (
  para: SectionContent,
  allSpecial: boolean
): FlatPara => {
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
        ...quote,
        start: current,
        end: current + text.length,
      });
    }
    current += text.length;
  }
  for (let i = 0; i < res.quotes!.length; i++) {
    const quote = res.quotes![i]!;
    const pre = res.text.slice(0, quote.start).match(/“[^a-z0-9‘]*$/)?.[0];
    if (pre) quote.start = quote.start - pre.length;
    const post = res.text.slice(quote.end).match(/^[^a-z0-9’]*”/)?.[0];
    if (post) quote.end = quote.end + post.length;
  }
  return res;
};

const slicePara = (para: FlatPara, part: Range): FlatPara => ({
  type: para.type,
  text: para.text.slice(part.start, part.end),
  lines: para.lines
    ?.filter((x) => doesRangeInclude(part, x))
    .map((x) => x - part.start),
  quotes: para.quotes
    ?.filter((q) => doRangesIntersect(q, part))
    .map((q) => ({
      ...q,
      ...moveRange(getRangesIntersect(q, part)!, -part.start),
    })),
  quoted: para.quoted
    .filter((q) => doRangesIntersect(q, part))
    .map((q) => ({
      ...q,
      ...moveRange(getRangesIntersect(q, part)!, -part.start),
    })),
  highlights: para.highlights
    .filter((q) => doRangesIntersect(q, part))
    .map((q) => moveRange(getRangesIntersect(q, part)!, -part.start)),
  sourceQuotes: para.sourceQuotes
    ?.filter((q) => doRangesIntersect(q, part))
    .map((q) => ({
      ...q,
      ...moveRange(getRangesIntersect(q, part)!, -part.start),
    })),
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
        ...(part.quotes || []).map((q) => ({ ...q, ...moveRange(q, current) }))
      );
      res.quoted.push(
        ...part.quoted.map((q) => ({ ...q, ...moveRange(q, current) }))
      );
      res.highlights.push(...part.highlights.map((q) => moveRange(q, current)));
      res.sourceQuotes!.push(
        ...(part.sourceQuotes || []).map((q) => ({
          ...q,
          ...moveRange(q, current),
        }))
      );
      current += part.text.length;
    }
  }

  const sourceQuotes = res.sourceQuotes.slice(0, 1);
  for (const q of res.sourceQuotes.slice(1)) {
    const last = sourceQuotes[sourceQuotes.length - 1]!;
    if (refsEqual(q, last) && q.start === last.end) {
      last.end = q.end;
    } else {
      sourceQuotes.push(q);
    }
  }
  res.sourceQuotes = sourceQuotes;

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
  const sourceQuotes: Quote[] = [];
  let current = 0;
  const result = joinParaParts(
    para.map((part) => {
      if (typeof part === "string") {
        current += part.length;
        return part;
      }
      const section = data[part.section]!;
      const end = current + part.end - part.start;
      sourceQuotes.push({ ...part, start: current, end });
      current = end;
      return slicePara(
        getPara(
          section.content[part.paragraph]!,
          getAllSpecial(section.content)
        ),
        part
      );
    })
  );
  result.sourceQuotes = sourceQuotes;
  return result;
};

export const filterQuoted = (
  para: FlatPara,
  quoted: Quote[],
  level: number
): FlatPara | null => {
  para.quoted = quoted;

  if (para.type === "break") return para;

  const indices = getIndices(para.text.length, para.quoted);
  const quotedParts = mapRanges(indices, (range) => ({
    range,
    quoted: para.quoted.filter((q) => doesRangeInclude(q, range)).length,
  })).filter((q) => q.quoted >= level);

  let current = 0;
  const nullParts: (null | FlatPara)[] = [];
  for (const { range } of quotedParts) {
    if (current < range.start) nullParts.push(null);
    nullParts.push(slicePara(para, range));
    current = range.end;
  }
  if (current < para.text.length) nullParts.push(null);

  if (nullParts.every((p) => p === null)) return null;
  const parts = nullParts
    .flatMap((p, i) => {
      if (p !== null) return p;
      const prev = nullParts[i - 1]?.text || "";
      const next = nullParts[i + 1]?.text || "";
      if (prev.endsWith(". . .") || next.startsWith(". . .")) return [];
      if (i === 0) return ". . . ";
      if (i === nullParts.length - 1) return " . . .";
      return " . . . ";
    })
    .filter((p) => p);
  return joinParaParts(parts);
};
