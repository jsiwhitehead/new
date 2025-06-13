import fs from "fs-extra";

import sources from "./sources.js";
import { readText, writeText } from "./utils.js";

(async () => {
  fs.emptyDirSync("./data/format");

  for (const author of Object.keys(sources)) {
    await Promise.all(
      Object.keys(sources[author]!).map(async (file) => {
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
            .replace(/^>\s*$/gm, "")
            .replace(/^(#+)\n+^(#+)/gm, (_, a, b) =>
              a.length < b.length ? `${a}\n\n${b}` : b
            )
            .replace(/(\s*\n){2,}/g, "\n\n")
            .replace(/#\n\n$/, "")
            .split("\n")
            .map((s) => s.trim())
            .join("\n")
            .trim()
        );
      })
    );
  }
})();
