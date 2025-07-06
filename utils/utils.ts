import spellingsJSON from "./spellings.json";

import type { Quote, Range, Ref, Section } from "./types";

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

const spellingsBase = spellingsJSON as any;
const spellings: Record<string, string> = Object.assign(
  spellingsBase.main,
  ...spellingsBase.sets
    .map(({ changes, roots, adjust = {} }: any) =>
      roots.map((r: any) =>
        Object.assign(
          {},
          ...Object.keys(changes).map((original) => {
            const changed = changes[original] as any;
            if (!adjust[r]) return { [`${r}${original}`]: `${r}${changed}` };
            return {
              [`${r}${original}`]: `${adjust[r]}${changed}`,
              [`${adjust[r]}${original}`]: `${adjust[r]}${changed}`,
              [`${r}${changed}`]: `${adjust[r]}${changed}`,
            };
          })
        )
      )
    )
    .flat()
);
const spellingsKeys = Object.keys(spellings);
export const fixSpellings = (text: string) => {
  return spellingsKeys.reduce(
    (res, k) =>
      res.replace(new RegExp(`\\b${k}\\b`, "ig"), (m) => {
        if ([...m].every((s) => s === s.toUpperCase())) {
          return spellings[k]!.toUpperCase();
        } else if (m[0] === m[0]!.toUpperCase()) {
          return spellings[k]!.split(" ")
            .map((s: string) => capitalise(s))
            .join(" ");
        }
        return spellings[k]!;
      }),
    text
  );
};
