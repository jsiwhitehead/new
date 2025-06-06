import fs from "fs-extra";

import fixes from "./fixes.json";
import sources from "./sources.js";
import { readText, writeText } from "./utils.js";

const fixesAny = fixes as any;

const fixesSpellKeys = Object.keys(fixes["*"]);

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

(async () => {
  fs.emptyDirSync("./data/fixes");

  for (const author of Object.keys(sources)) {
    await Promise.all(
      Object.keys(sources[author]!).map(async (file) => {
        const id = `${author}-${file}`;
        const replace = fixesAny[author]?.[file] || [];
        await writeText(
          "fixes",
          id,
          fixesSpellKeys.reduce(
            (res, k) =>
              res.replace(new RegExp(`\\b${k}\\b`, "ig"), (m) => {
                if ([...m].every((s) => s === s.toUpperCase())) {
                  return fixesAny["*"][k].toUpperCase();
                } else if (m[0] === m[0]!.toUpperCase()) {
                  return capitalise(fixesAny["*"][k]);
                }
                return fixesAny["*"][k];
              }),
            replace.reduce(
              (res: string, [a, b]: [string, string]) => res.replace(a, b),
              await readText("download", id)
            ) as string
          )
        );
      })
    );
  }
})();
