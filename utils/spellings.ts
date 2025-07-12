import spellingsJSON from "./spellings.json" with { type: "json" };

import { capitalise, toCleaned } from "./utils.ts";

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
const spellingsKeys = Object.keys(spellings).filter((k) => /[ ‑’]/.test(k));

const segmenter = new Intl.Segmenter("en", { granularity: "word" });

const fixSpellings = (text: string) =>
  spellingsKeys
    .reduce(
      (res, k) =>
        res.replace(new RegExp(`\\b${k}\\b`, "ig"), (m) => {
          if (m === m.toUpperCase()) {
            return spellings[k]!.toUpperCase();
          } else if (m[0] === m[0]!.toUpperCase()) {
            return spellings[k]!.split(" ")
              .map((s: string) => capitalise(s))
              .join(" ");
          }
          return spellings[k]!;
        }),
      [...segmenter.segment(text)]
        .flatMap((segment) => segment.segment.split(/([‑’])/g))
        .map((word) => {
          const lower = toCleaned(word);
          if (spellings[lower]) {
            if (word === word.toUpperCase()) {
              return spellings[lower]!.toUpperCase();
            } else if (word[0] === word[0]!.toUpperCase()) {
              return capitalise(spellings[lower]!);
            }
            return spellings[lower]!;
          }
          return word;
        })
        .join("")
    )
    .replace(/ Iráq/g, " ‘Iráq")
    .replace(/ IRÁQ/g, " ‘IRÁQ")
    .replace(/Mákú/g, "Máh‑Kú")
    .replace(/Sád/g, "Ṣád");

export default fixSpellings;
