import fs from "fs-extra";

import fixesJSON from "./fixes.json";
import spellingsJSON from "./spellings.json";

import sources from "./sources.js";
import { readText, writeText } from "./utils.js";

const fixes = fixesJSON as any;

const spellingsBase = spellingsJSON as any;
const spellings = Object.assign(
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

const allChanges = { ...fixes["*"], ...spellings };
const allKeys = [...Object.keys(fixes["*"]), ...Object.keys(spellings)];

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

(async () => {
  fs.emptyDirSync("./data/tidy");

  for (const author of Object.keys(sources)) {
    await Promise.all(
      Object.keys(sources[author]!).map(async (file) => {
        if (sources[author]![file]!.length > 0) {
          const id = `${author}-${file}`;
          await writeText(
            "tidy",
            id,
            allKeys
              .reduce(
                (res, k) =>
                  res.replace(new RegExp(`\\b${k}\\b`, "ig"), (m: string) => {
                    if ([...m].every((s) => s === s.toUpperCase())) {
                      return allChanges[k].toUpperCase();
                    } else if (m[0] === m[0]!.toUpperCase()) {
                      return capitalise(allChanges[k]);
                    }
                    return allChanges[k];
                  }),
                (fixes[author]?.[file] || [])
                  .reduce(
                    (res: string, [a, b]: [string, string]) =>
                      res.replace(a, b),
                    await readText("download", id)
                  )
                  .replace(/\u200E/g, "")
                  .replace(/\u00AD/g, "")
                  .replace(/\u035F/g, "")
                  .replace(/á/g, "á")
                  .replace(/Á/g, "Á")
                  .replace(/í/g, "í")
                  .replace(/Í/g, "Í")
                  .replace(/œ/g, "oe")
                  .replace(/ /g, " ")
                  .replace(/-/g, "‑")
                  .replace(/–/g, "—")
                  .replace(/─/g, "—")
                  .replace(/‑‑/g, "—")
                  .replace(/ "/g, " “")
                  .replace(/"([ ,.])/g, (_: any, m: any) => `”${m}`)
                  .replace(/“ /g, "“")
                  .replace(/ ”/g, "”")
                  .replace(/ '/g, " ‘")
                  .replace(/“'/g, "“‘")
                  .replace(/'/g, "’")
                  .replace(/…/g, "...")
                  .replace(/\.([  ]?\.){3,}/g, ". . . .")
                  .replace(/\.\.\./g, ". . .")
                  .replace(/\[ ?\. \. \.\ ?]/g, ". . .")
                  .replace(
                    /([,;:!?”’])\. \. \./g,
                    (_: any, m: any) => `${m} \. \. \.`
                  )
                  .replace(
                    /\. \. \.([,;:!?“‘\[])/g,
                    (_: any, m: any) => `\. \. \. ${m}`
                  )
                  .replace(
                    /([”’]) \. \. \. \./g,
                    (_: any, m: any) => `${m}\. \. \. \.`
                  )
                  .replace(/ \. \. \. \./g, " . . .")
                  .replace(/\. \. \. \./g, ". . . .")
                  .replace(/\. \. \./g, ". . .")
                  .replace(
                    /(\. \. \.)([a-z])/gi,
                    (_: any, a: any, b: any) => `${a} ${b}`
                  )
                  .replace(
                    /([a-zá])(\. \. \.)/gi,
                    (_: any, a: any, b: any) => `${a} ${b}`
                  )
                  .replace(/^\* \* \*$/gm, "***")

                  .replace(/’i\b/g, "’í")
                  .replace(/\bcoö/g, "coo")
                  .replace(/\bprë/g, "pre")
                  .replace(/\bpreë/g, "pree")
              )
              .replace(/ Iráq/g, " ‘Iráq")
              .replace(/ IRÁQ/g, " ‘IRÁQ")
              .replace(/Mákú/g, "Máh‑Kú")
          );
        }
      })
    );
  }
})();
