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

  await writeJSON(
    "",
    "data",
    allStructure.sort((aDoc, bDoc) => {
      const a = aDoc.path.map((p: [string, string, number]) => p[2]);
      const b = bDoc.path.map((p: [string, string, number]) => p[2]);

      const len = Math.max(a.length, b.length);
      for (let i = 0; i < len; i++) {
        const aVal = a[i];
        const bVal = b[i];

        if (aVal === undefined) return -1;
        if (bVal === undefined) return 1;

        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
      }
      return 0;
    })
  );
})();
