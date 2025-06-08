import sources from "./sources.js";
import type { Section } from "./structure.js";
import { readJSON, writeJSON } from "./utils.js";

const ignoreStarts = [
  " ",
  ",",
  "‑",
  "”",
  "abá",
  "Ábidín",
  "Abbás",
  "Abdu",
  "Ád",
  "ah",
  "Ahd",
  "Akká",
  "AKKÁ",
  "Alam",
  "Alá",
  "Alí",
  "Álí",
  "ALÍ",
  "ám",
  "Ammú",
  "Amú",
  "Arab",
  "Árif",
  "Áshúrá",
  "ávíyih",
  "áyidih",
  "Ayn",
  "Azíz",
  "AZÍZ",
  "Aṭá",
  "Aẓím",
  "‘áẓ",
  "bán",
  "farán",
  "far‑i",
  "far‑Q",
  "íd",
  "ih",
  "IH",
  "íl",
  "ÍLÍYYIH",
  "Ilm",
  "Imrán",
  "ín",
  "Ináyatí",
  "Iráq",
  "IRÁQ",
  "Ishqábád",
  "Izzat",
  "mán",
  "n,",
  "tamid",
  "timádu",
  "’u",
  "u’",
  "úd",
  "Údí",
  "ulamá",
  "Ulamá",
  "Umar",
  "Urvatu",
  "Uthmán",
  "ẓam",
];

const strip = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const normalise = (stripped: string) => stripped.replace(/[^a-z0-9‑— ]/g, "");

const getNGrams = (norm: string, n = 20) => {
  const words = norm.split(/[‑— ]+/);
  if (words.length < n) return [];
  const ngrams: string[] = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(" "));
  }
  return ngrams;
};

const normalizeForMatching = (stripped: string) => {
  const normalizedChars: string[] = [];
  const indexMap: number[] = [];
  for (let i = 0; i < stripped.length; i++) {
    const char = stripped[i]!;
    if (/[a-z0-9‑— ]/.test(char)) {
      normalizedChars.push(char.toLowerCase());
      indexMap.push(i);
    }
  }
  return { normalized: normalizedChars.join(""), indexMap };
};

const findQuoteIndices = (
  strippedSource: string,
  normQuote: string
): [number, number] => {
  const { normalized: normSource, indexMap } =
    normalizeForMatching(strippedSource);

  const startNormIndex = normSource.indexOf(normQuote);
  const endNormIndex = startNormIndex + normQuote.length - 1;

  let startIndex = indexMap[startNormIndex]!;
  let endIndex = indexMap[endNormIndex]!;

  while (
    startIndex > 0 &&
    !/[a-z0-9‑— “”‘’]/.test(strippedSource[startIndex - 1]!)
  ) {
    startIndex--;
  }

  while (
    endIndex < strippedSource.length - 1 &&
    !/[a-z0-9‑— “”‘’]/.test(strippedSource[endIndex + 1]!)
  ) {
    endIndex++;
  }

  return [startIndex, endIndex + 1];
};

const splitQuoted = (text: string): string[] => {
  const result: string[] = [""];
  let expectedCloseQuote: string | null = null;
  const quotePairs: Record<string, string> = { "‘": "’", "“": "”" };
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (
      char === expectedCloseQuote &&
      !/[a-z‑]/.test(strip(text[i + 1] || " "))
    ) {
      result.push(char, "");
      expectedCloseQuote = null;
    } else if (
      !expectedCloseQuote &&
      quotePairs[char] &&
      !/[a-z‑]/.test(strip(text[i - 1] || " ")) &&
      !(
        char === "‘" &&
        ignoreStarts.some((a) => text.slice(i + 1).startsWith(a))
      )
    ) {
      result.push(char, "");
      expectedCloseQuote = quotePairs[char];
    } else {
      result[result.length - 1] += char;
    }
  }
  return result.length === 1 ? ["", result[0]!, ""] : result;
};

const checkCanReference = (section: Section) =>
  !["Bahá’u’lláh", "The Báb"].includes(section.path[0]![0]) &&
  !section.prayer &&
  !section.meta;

const checkDoReference = (
  quotePath: [string, string, number][],
  sourcePath: [string, string, number][]
) =>
  JSON.stringify(quotePath) !== JSON.stringify(sourcePath) &&
  (quotePath[0]![0] !== sourcePath[0]![0] ||
    !["Bahá’u’lláh", "The Báb", "‘Abdu’l‑Bahá"].includes(quotePath[0]![0]));

const linkContent = (sections: Section[]) => {
  sections.sort((a, b) => a.years[0] - b.years[0]);
  const ngramMap = new Map();

  for (const section of sections) {
    section.content = section.content.map((p, i) => {
      const text = typeof p === "string" ? p : !Array.isArray(p) ? p.text : "";
      const fullStripped = strip(text);

      const parts = splitQuoted(text).flatMap((p) => p.split(/( ?\. \. \. ?)/));

      const processedParts = parts.map((partText, j) => {
        const norm = normalise(strip(partText));
        const ngrams = getNGrams(norm);
        if (ngrams.length === 0) return partText;

        if (checkCanReference(section)) {
          for (const ng of ngrams) {
            if (ngramMap.has(ng)) {
              const source = ngramMap.get(ng);
              if (checkDoReference(section.path, source.section)) {
                const normSource = normalise(source.stripped);
                if (normSource.includes(norm)) {
                  const [start, end] = findQuoteIndices(source.stripped, norm);
                  return {
                    ...source,
                    start,
                    end,
                  };
                }
              }
            }
          }
        }

        for (const ng of ngrams) {
          if (!ngramMap.has(ng)) {
            ngramMap.set(ng, {
              section: section.path,
              paragraph: i,
              stripped: fullStripped,
            });
          }
        }

        return partText;
      });

      for (let i = 0; i < processedParts.length; i += 1) {
        if (typeof processedParts[i] !== "string") {
          for (let j = 0; j < processedParts.length; j += 1) {
            if (typeof processedParts[j] === "string") {
              const norm = normalise(strip(processedParts[j] as string));
              if (/[a-z]/.test(norm)) {
                const normSource = normalise(processedParts[i].stripped);
                if (normSource.includes(norm)) {
                  const [start, end] = findQuoteIndices(
                    processedParts[i].stripped,
                    norm
                  );
                  processedParts[j] = {
                    ...processedParts[i],
                    start,
                    end,
                  };
                }
              }
            }
          }
        }
      }

      const result = processedParts
        .reduce((res, part) => {
          if (
            typeof part === "string" &&
            typeof res[res.length - 1] === "string"
          ) {
            res[res.length - 1] += part;
          } else {
            res.push(part);
          }
          return res;
        }, [] as any[])
        .map((p: any) =>
          typeof p === "string"
            ? p
            : {
                ...p,
                section: p.section.map((a: any) => a[2]).join("/"),
                stripped: undefined,
              }
        )
        .filter((p: any) => p);

      return result.length === 1 && typeof result[0] === "string" ? p : result;
    });
  }
};

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

  linkContent(allStructure);

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
