import type { Quote, Range, Ref, SectionContent } from "../utils/types";
import {
  doesRangeInclude,
  doRangesIntersect,
  getQuoteText,
  getRangesIntersect,
  moveRange,
  textIsConnector,
} from "../utils/utils";

import { getUrlQuote } from "./quote";
import type { FlatPara, MultiRef, RenderContent } from "./utils";
import { data, getAllSpecial, mergeQuotes } from "./utils";

const getIndices = (length: number, ...markers: Range[][]) =>
  [
    ...new Set([
      0,
      ...markers.flatMap((m) => m.flatMap(({ start, end }) => [start, end])),
      length,
    ]),
  ].sort((a, b) => a - b);

const mapRanges = <T>(indices: number[], map: (range: Range) => T) =>
  indices.slice(1).map((end, i) => map({ start: indices[i]!, end }));

export const getPara = (
  para: SectionContent,
  flatQuoted: Quote[] = [],
  allSpecial: boolean
): FlatPara => {
  const quoted = flatQuoted.map(({ start, end, section, paragraph }) => ({
    range: { start, end },
    quote: { section, paragraph },
  }));
  const base = { quoted, highlights: [], allSpecial };
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
        quote: { section: quote.section, paragraph: quote.paragraph },
      });
    }
    current += text.length;
  }
  for (let i = 0; i < res.quotes!.length; i++) {
    const current = res.quotes![i]!.range;
    const pre = res.text.slice(0, current.start).match(/“[^a-z0-9‘]*$/)?.[0];
    if (pre) current.start = current.start - pre.length;
    const post = res.text.slice(current.end).match(/^[^a-z0-9’]*”/)?.[0];
    if (post) current.end = current.end + post.length;
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
    ?.filter((q) => doRangesIntersect(q.range, part))
    .map((q) => ({
      range: moveRange(getRangesIntersect(q.range, part)!, -part.start),
      quote: q.quote,
    })),
  quoted: para.quoted
    .filter((q) => doRangesIntersect(q.range, part))
    .map((q) => ({
      range: moveRange(getRangesIntersect(q.range, part)!, -part.start),
      quote: q.quote,
    })),
  highlights: para.highlights
    .filter((q) => doRangesIntersect(q, part))
    .map((q) => moveRange(getRangesIntersect(q, part)!, -part.start)),
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
  const base = { quoted: [], highlights: [], allSpecial: false };
  if (typeof paraBase === "string") return { text: paraBase, ...base };
  if (!Array.isArray(paraBase)) return { type: "break", text: "", ...base };
  const para = paraBase as (string | Quote)[];
  return joinParaParts(
    para.map((part) => {
      if (typeof part === "string") return part;
      const section = data[part.section]!;
      return slicePara(
        getPara(
          section.content[part.paragraph]!,
          section.quoted?.[part.paragraph],
          getAllSpecial(section.content)
        ),
        part
      );
    })
  );
};

export const filterQuoted = (
  para: FlatPara,
  level: number
): FlatPara | null => {
  if (para.type === "break") return para;

  const indices = getIndices(
    para.text.length,
    para.quoted.map((q) => q.range)
  );
  const quotedParts = mapRanges(indices, (range) => ({
    range,
    quoted: para.quoted.filter((q) => doesRangeInclude(q.range, range)).length,
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

const capitaliseQuotes = (para: FlatPara) => {
  para.text = para.text
    .replace(/^[a-z]/, (s) => s.toUpperCase())
    .replace(/([^ ][.?!] |^)“+[a-z]/g, (s) => s.toUpperCase());
};

const alternateQuoteMarks = (para: FlatPara) => {
  let level = 1;
  let res = "";
  for (let i = 0; i < para.text.length; i++) {
    if (para.text[i] === "“") {
      level++;
      if (level % 2 === 0) res += "“";
      else res += "‘";
    } else if (para.text[i] === "”") {
      if (level % 2 === 0) res += "”";
      else res += "’";
      level--;
    } else {
      res += para.text[i];
    }
  }
  para.text = res;
};

export const getRenderContent = (
  para: FlatPara
): { content: RenderContent; quotes: MultiRef[] } => {
  capitaliseQuotes(para);
  alternateQuoteMarks(para);

  if (para.type === "break") return { content: { type: "break" }, quotes: [] };

  const indices = getIndices(
    para.text.length,
    para.quoted.map((q) => q.range),
    para.highlights
  );

  const quoteIndices = getIndices(
    para.text.length,
    (para.quotes || []).map((q) => q.range)
  );
  const quoteParts: { text: string; quote?: Ref | true }[] = mapRanges(
    quoteIndices,
    (range) => ({
      text: para.text.slice(range.start, range.end),
      quote: (para.quotes || []).find((q) => doesRangeInclude(q.range, range))
        ?.quote,
    })
  );
  for (let i = 0; i < quoteParts.length; i++) {
    const current = quoteParts[i]!;
    const prev = quoteParts[i - 1]!;
    const next = quoteParts[i + 1]!;
    if (
      !current.quote &&
      textIsConnector(current.text) &&
      (!prev || prev.quote) &&
      (!next || next.quote)
    ) {
      current.quote = true;
    }
  }

  const allQuote = quoteParts.every((part) => part.quote);
  if (allQuote || para.type) {
    return {
      content: {
        type: allQuote ? "quote" : para.type!,
        lines: [
          mapRanges(indices, (range) => ({
            text: para.text.slice(range.start, range.end),
            quoted: para.quoted.filter((q) => doesRangeInclude(q.range, range))
              .length,
            highlight: para.highlights.some((h) => doesRangeInclude(h, range)),
          })),
        ],
        allSpecial: para.allSpecial,
      },
      quotes: mergeQuotes(
        ((allQuote && para.quotes) || []).map((q) => q.quote!)
      ),
    };
  }

  if (para.lines) {
    return {
      content: {
        type: "lines",
        lines: mapRanges([-1, ...para.lines, para.text.length], (lineRange) => {
          const lineIndices = [
            lineRange.start + 1,
            ...indices.filter(
              (x) => lineRange.start + 1 < x && x < lineRange.end
            ),
            lineRange.end,
          ];
          return mapRanges(lineIndices, (range) => ({
            text: para.text.slice(range.start, range.end),
            quoted: para.quoted.filter((q) => doesRangeInclude(q.range, range))
              .length,
            highlight: para.highlights.some((h) => doesRangeInclude(h, range)),
          }));
        }),
        allSpecial: para.allSpecial,
      },
      quotes: [],
    };
  }

  let current = 0;
  const result = quoteParts.flatMap((part) => {
    const partIndices = [
      0,
      ...indices
        .map((x) => x - current)
        .filter((x) => 0 < x && x < part.text.length),
      part.text.length,
    ];
    const res = mapRanges(partIndices, (range) => {
      const moved = moveRange(range, current);
      return {
        text: part.text.slice(range.start, range.end),
        quote:
          typeof part.quote === "object" ? getUrlQuote(part.quote) : part.quote,
        quoted: para.quoted.filter((q) => doesRangeInclude(q.range, moved))
          .length,
        highlight: para.highlights.some((h) => doesRangeInclude(h, moved)),
      };
    });
    current += part.text.length;
    return res;
  });
  const resQuoteParts = result.filter((x) => typeof x.quote === "object");
  for (let i = 0; i < resQuoteParts.length; i++) {
    if (
      JSON.stringify(resQuoteParts[i]?.quote) ===
      JSON.stringify(resQuoteParts[i + 1]?.quote)
    ) {
      (resQuoteParts[i]!.quote as any) = true;
    }
  }
  return { content: result, quotes: [] };
};
