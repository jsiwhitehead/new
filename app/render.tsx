import type { SemiPara, RenderContent } from "../utils/types";
import {
  doesRangeInclude,
  getIndices,
  getQuoteParts,
  mapRanges,
  moveRange,
} from "../utils/utils";

const capitaliseQuotes = (para: SemiPara) => {
  para.text = para.text
    .replace(/^[a-z]/, (s) => s.toUpperCase())
    .replace(/([^ ][.?!] |^)(“+[a-z])/g, (_, a, b) => a + b.toUpperCase());
};

const alternateQuoteMarks = (para: SemiPara) => {
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

export const getRenderContent = (para: SemiPara): RenderContent => {
  capitaliseQuotes(para);
  alternateQuoteMarks(para);

  if (para.type === "break") return { type: "break" };

  if (para.text === ". . .") {
    return [{ text: ". . .", quoted: 0, highlight: false }];
  }

  const indices = getIndices(para.text.length, para.quoted, para.highlights);

  const quoteParts = getQuoteParts(para.text, para.quotes || []);

  const allQuote = quoteParts.every((part) => part.quote);
  if (allQuote || para.type) {
    return {
      type: allQuote ? "quote" : para.type!,
      lines: [
        mapRanges(indices, (range) => ({
          text: para.text.slice(range.start, range.end),
          quoted: para.quoted.filter((q) => doesRangeInclude(q, range)).length,
          highlight: para.highlights.some((h) => doesRangeInclude(h, range)),
        })),
      ],
      allSpecial: para.allSpecial,
    };
  }

  if (para.lines) {
    return {
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
          quoted: para.quoted.filter((q) => doesRangeInclude(q, range)).length,
          highlight: para.highlights.some((h) => doesRangeInclude(h, range)),
        }));
      }),
      allSpecial: para.allSpecial,
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
        quote: typeof part.quote === "object" ? part.quote : part.quote,
        quoted: para.quoted.filter((q) => doesRangeInclude(q, moved)).length,
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
  return result;
};
