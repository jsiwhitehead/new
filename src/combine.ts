import sources from "./sources.js";
import { readJSON, writeJSON } from "./utils.js";

(async () => {
  const allStructure: any[] = [];

  for (const author of Object.keys(sources)) {
    await Promise.all(
      Object.keys(sources[author]!).map(async (file) => {
        const id = `${author}-${file}`;
        const structure = (await readJSON("structure", id)) as any[];
        allStructure.push(...structure);
      })
    );
  }

  await writeJSON("", "data", allStructure);
})();
