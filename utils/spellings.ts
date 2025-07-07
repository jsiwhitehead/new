import spellingsJSON from "./spellings.json";

import { capitalise } from "./utils";

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
const fixSpellings = (text: string) => {
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

export default fixSpellings;
