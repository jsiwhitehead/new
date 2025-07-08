import type { Quote, Range, Ref, Section } from "./types.ts";

export const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const sum = (array: number[]) => array.reduce((a, b) => a + b, 0);

export const makeObject = <T, U>(
  array: T[],
  map: (value: T) => [string, U | undefined]
) =>
  array.reduce<Record<string, U>>((res, item) => {
    const [k, v] = map(item);
    return v === undefined ? res : { ...res, [k]: v };
  }, {});

export const mapObject = <T, U>(
  obj: Record<string, T>,
  map: (value: T, key: string) => U | undefined
) => makeObject(Object.keys(obj), (k) => [k, map(obj[k]!, k)]);

export const refsEqual = (a: Ref, b: Ref) =>
  a.section === b.section && a.paragraph === b.paragraph;

export const uniqueRefs = (arr: Ref[]) => {
  const res: Ref[] = [];
  for (const obj of arr) {
    if (!res.some((x) => refsEqual(x, obj))) res.push(obj);
  }
  return res;
};

export const toCleaned = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const toWords = (cleaned: string) =>
  cleaned
    .replace(/[^a-z0-9‑— ]/g, "")
    .replace(/[‑—]/g, " ")
    .replace(/ +/g, " ")
    .trim();

export const toChars = (words: string) => words.replace(/ /g, "");

export const textIsConnector = (cleaned: string) =>
  !/[a-z0-9]/.test(cleaned.replace(/\[[^\]]*\]/g, ""));

export const getText = (data: Section[], ref: Ref): string => {
  const para = data[ref.section]!.content[ref.paragraph]!;
  if (typeof para === "string") return para;
  if (!Array.isArray(para)) {
    if ("type" in para && para.type === "break") return "";
    return para.text;
  }
  return para
    .map((part) => (typeof part === "string" ? part : getQuoteText(data, part)))
    .join("");
};

export const getQuoteText = (data: Section[], quote: Quote) =>
  getText(data, quote).slice(quote.start, quote.end);

export const doesRangeInclude = (outer: Range, inner: number | Range) =>
  typeof inner === "number"
    ? outer.start <= inner && inner <= outer.end
    : outer.start <= inner.start && inner.end <= outer.end;

export const doRangesIntersect = (a: Range, b: Range) =>
  a.start < b.end && b.start < a.end;

export const getRangesIntersect = (a: Range, b: Range): Range | null => {
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  if (start < end) return { start, end };
  else return null;
};

export const moveRange = (r: Range, move: number) => ({
  start: r.start + move,
  end: r.end + move,
});

export const compareArrays = (a: number[], b: number[]) => {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const aVal = a[i];
    const bVal = b[i];

    if (aVal === undefined) return -1;
    if (bVal === undefined) return 1;

    if (aVal !== bVal && aVal === 0) return 1;
    if (aVal !== bVal && bVal === 0) return -1;

    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
  }
  return 0;
};

export const getIndices = (length: number, ...markers: Range[][]) =>
  [
    ...new Set([
      0,
      ...markers.flatMap((m) => m.flatMap(({ start, end }) => [start, end])),
      length,
    ]),
  ].sort((a, b) => a - b);

export const mapRanges = <T>(indices: number[], map: (range: Range) => T) =>
  indices.slice(1).map((end, i) => map({ start: indices[i]!, end }));

export const getQuoteParts = <T>(
  text: string,
  quotes: { base: Quote; quote: T }[]
) => {
  const quoteIndices = getIndices(
    text.length,
    quotes.map((q) => q.base)
  );
  const quoteParts: { text: string; quote?: T | true }[] = mapRanges(
    quoteIndices,
    (range) => {
      return {
        text: text.slice(range.start, range.end),
        quote: quotes.find((q) => doesRangeInclude(q.base, range))?.quote,
      };
    }
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
  return quoteParts;
};
