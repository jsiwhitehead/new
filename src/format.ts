import fs from "fs-extra";

import sources from "./sources";
import { readText, writeText } from "./utils";

(async () => {
  fs.emptyDirSync("./data/format");

  for (const author of Object.keys(sources)) {
    await Promise.all(
      Object.keys(sources[author]!).map(async (file) => {
        if (sources[author]![file]!.length > 0) {
          const id = `${author}-${file}`;
          const replace = sources[author]![file]!;
          await writeText(
            "format",
            id,
            replace
              .reduce(
                (res, [a, b]) => res.replace(a, b as any),
                await readText("tidy", id)
              )
              .replace(/ +/g, " ")
              .replace(/^>\s*$/gm, "")
              .replace(/(#+\n+)+#/gm, "#")
              .replace(/(\s*\n){2,}/g, "\n\n")
              .replace(/#\n\n$/, "")
              .split("\n")
              .map((s) => s.trim())
              .join("\n")
              .trim()
          );
        }
      })
    );
  }
})();
