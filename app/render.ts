import type {
  Quote,
  QuoteLink,
  SemiPara,
  RenderContent,
  RenderQuote,
} from "../utils/types";
import {
  doesRangeInclude,
  getIndices,
  mapRanges,
  moveRange,
  refsEqual,
  textIsConnector,
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

const getBaseRenderContent = (para: SemiPara): RenderContent => {
  capitaliseQuotes(para);
  alternateQuoteMarks(para);

  if (para.type === "break") return { type: "break" };

  if (para.text === ". . .") {
    return [{ text: ". . .", quoted: 0, highlight: false }];
  }

  if (para.quotes) {
    for (let i = 0; i < para.quotes!.length; i++) {
      const {
        quote: { range },
      } = para.quotes![i]!;
      const pre = para.text.slice(0, range.start).match(/“[^a-z0-9‘]*$/)?.[0];
      if (pre) range.start = range.start - pre.length;
      const post = para.text.slice(range.end).match(/^[^a-z0-9’]*”/)?.[0];
      if (post) range.end = range.end + post.length;
    }
  }

  const quoteIndices = getIndices(
    para.text.length,
    (para.quotes || []).map((q) => q.quote.range)
  );
  const quoteParts: {
    text: string;
    quote?: { quote: Quote; render: RenderQuote } | true;
  }[] = mapRanges(quoteIndices, (range) => {
    const q = (para.quotes || []).find((q) =>
      doesRangeInclude(q.quote.range, range)
    );
    return {
      text: para.text.slice(range.start, range.end),
      quote: q && { quote: q.quote.quote, render: q.render },
    };
  });
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
      type: allQuote ? "quote" : para.type!,
      lines: [[{ text: para.text, quoted: 0, highlight: false }]],
      allSpecial: para.allSpecial,
    };
  }

  if (para.lines) {
    return {
      type: "lines",
      lines: mapRanges([-1, ...para.lines, para.text.length], (lineRange) => [
        {
          text: para.text.slice(lineRange.start + 1, lineRange.end),
          quoted: 0,
          highlight: false,
        },
      ]),
      allSpecial: para.allSpecial,
    };
  }

  const result = quoteParts.flatMap((part) => ({
    text: part.text,
    quote:
      typeof part.quote === "object"
        ? { quotes: [part.quote.quote], render: part.quote.render }
        : part.quote,
    quoted: 0,
    highlight: false,
  }));

  const resQuoteParts = result.filter((x) => typeof x.quote === "object");
  for (let i = 0; i < resQuoteParts.length - 1; i++) {
    const current = resQuoteParts[i]!.quote as QuoteLink;
    const next = resQuoteParts[i + 1]!.quote as QuoteLink;
    if (refsEqual(current.quotes[0]!, next.quotes[0]!)) {
      next.quotes.push(...current.quotes);
      resQuoteParts[i]!.quote = true;
    }
  }

  return result;
};

const getFillsRenderContent = (
  para: SemiPara,
  paraId: string
): RenderContent => {
  capitaliseQuotes(para);
  alternateQuoteMarks(para);

  if (para.type === "break") return { type: "break" };

  if (para.text === ". . .") {
    return [{ text: ". . .", quoted: 0, highlight: false }];
  }

  const highlightIndices = getIndices(para.text.length, para.highlights);

  if (para.quotes) {
    for (let i = 0; i < para.quotes!.length; i++) {
      const {
        quote: { range },
      } = para.quotes![i]!;
      const pre = para.text.slice(0, range.start).match(/“[^a-z0-9‘]*$/)?.[0];
      if (pre) range.start = range.start - pre.length;
      const post = para.text.slice(range.end).match(/^[^a-z0-9’]*”/)?.[0];
      if (post) range.end = range.end + post.length;
    }
  }

  for (const h of para.highlights) {
    const pre = para.text.slice(0, h.start).match(/[^ ]*$/)?.[0];
    if (pre) h.start = h.start - pre.length;
    const post = para.text.slice(h.end).match(/^[^ ]*/)?.[0];
    if (post) h.end = h.end + post.length;
  }

  const indices = getIndices(
    para.text.length,
    para.quoted
      .map((q) => q.range)
      .flatMap(({ start, end }) =>
        Array.from({ length: end - start + 1 }, (_, i) => ({
          start: start + i,
          end: start + i,
        }))
      ),
    para.highlights.flatMap(({ start, end }) =>
      Array.from({ length: end - start + 1 }, (_, i) => ({
        start: start + i,
        end: start + i,
      }))
    )
  );

  const quoteIndices = getIndices(
    para.text.length,
    (para.quotes || []).map((q) => q.quote.range)
  );
  const quoteParts: {
    text: string;
    quote?: { quote: Quote; render: RenderQuote } | true;
  }[] = mapRanges(quoteIndices, (range) => {
    const q = (para.quotes || []).find((q) =>
      doesRangeInclude(q.quote.range, range)
    );
    return {
      text: para.text.slice(range.start, range.end),
      quote: q && { quote: q.quote.quote, render: q.render },
    };
  });
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
      type: allQuote ? "quote" : para.type!,
      lines: [
        mapRanges(indices, (range) => ({
          text: para.text.slice(range.start, range.end),
          quoted: para.quoted.filter((q) => doesRangeInclude(q.range, range))
            .length,
          highlight: para.highlights.some((h) => doesRangeInclude(h, range)),
          id: highlightIndices.includes(range.start)
            ? `${paraId}_${range.start}`
            : undefined,
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
          quoted: para.quoted.filter((q) => doesRangeInclude(q.range, range))
            .length,
          highlight: para.highlights.some((h) => doesRangeInclude(h, range)),
          id: highlightIndices.includes(range.start)
            ? `${paraId}_${range.start}`
            : undefined,
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
        quote:
          typeof part.quote === "object"
            ? { quotes: [part.quote.quote], render: part.quote.render }
            : part.quote,
        quoted: para.quoted.filter((q) => doesRangeInclude(q.range, moved))
          .length,
        highlight: para.highlights.some((h) => doesRangeInclude(h, moved)),
        id: highlightIndices.includes(moved.start)
          ? `${paraId}_${moved.start}`
          : undefined,
      };
    });
    current += part.text.length;
    return res;
  });

  const resQuoteParts = result.filter((x) => typeof x.quote === "object");
  for (let i = 0; i < resQuoteParts.length - 1; i++) {
    const current = resQuoteParts[i]!.quote as QuoteLink;
    const next = resQuoteParts[i + 1]!.quote as QuoteLink;
    if (refsEqual(current.quotes[0]!, next.quotes[0]!)) {
      next.quotes.push(...current.quotes);
      resQuoteParts[i]!.quote = true;
    }
  }

  return result;
};

export const getRenderContent = (
  para: SemiPara,
  paraId: string,
  hasFills: boolean
): RenderContent =>
  hasFills ? getFillsRenderContent(para, paraId) : getBaseRenderContent(para);
