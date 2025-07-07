import { emptyDir, readText, writeText } from "../utils/files.ts";
import fixSpellings from "../utils/spellings.ts";

import fixesJSON from "./fixes.json" with { type: "json" };
import sources from "./sources.ts";

const fixes = fixesJSON as unknown as Record<
  string,
  Record<string, [string, string][]>
>;

await emptyDir("./data/tidy");

for (const author of Object.keys(sources)) {
  await Promise.all(
    Object.keys(sources[author]!).map(async (file) => {
      const isManual = sources[author]![file]!.length === 0;
      const id = `${author}-${file}`;
      await writeText(
        isManual ? "manual" : "tidy",
        id,
        fixSpellings(
          (fixes[author]?.[file] || [])
            .reduce(
              (res: string, [a, b]: [string, string]) => res.replace(a, b),
              await readText(isManual ? "manual" : "download", id)
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
            .replace(/"([ ,.])/g, (_, m) => `”${m}`)
            .replace(/“ /g, "“")
            .replace(/ ”/g, "”")
            .replace(/ '/g, " ‘")
            .replace(/“'/g, "“‘")
            .replace(/'/g, "’")
            .replace(/…/g, "...")
            .replace(/\.([  ]?\.){3,}/g, ". . . .")
            .replace(/\.\.\./g, ". . .")
            .replace(/\[ ?\. \. \.\ ?]/g, ". . .")
            .replace(/([,;:!?”’])\. \. \./g, (_, m) => `${m} \. \. \.`)
            .replace(/\. \. \.([,;:!?“‘\[])/g, (_, m) => `\. \. \. ${m}`)
            .replace(/([”’]) \. \. \. \./g, (_, m) => `${m}\. \. \. \.`)
            .replace(/ \. \. \. \./g, " . . .")
            .replace(/\. \. \. \./g, ". . . .")
            .replace(/\. \. \./g, ". . .")
            .replace(/(\. \. \.)([a-z])/gi, (_, a, b) => `${a} ${b}`)
            .replace(/([a-zá])(\. \. \.)/gi, (_, a, b) => `${a} ${b}`)
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
    })
  );
}
