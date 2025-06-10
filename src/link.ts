import sources from "./sources.js";
import type { Section, SectionContent } from "./structure.js";
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

const getNGrams = (norm: string, n = 10) => {
  const words = norm.split(/[‑— ]+/);
  if (words.length < n) return [];
  const ngrams: string[] = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(" "));
  }
  return ngrams;
};

const normalizeForMatching = (stripped: string) => {
  const alphaNumChars: string[] = [];
  const indexMap: number[] = [];
  for (let i = 0; i < stripped.length; i++) {
    const char = stripped[i]!;
    if (/[a-z0-9]/.test(char)) {
      alphaNumChars.push(char.toLowerCase());
      indexMap.push(i);
    }
  }
  return { alphaNum: alphaNumChars.join(""), indexMap };
};

const findQuoteIndices = (
  strippedSource: string,
  normQuote: string
): [number, number] => {
  const { alphaNum: alphaNumSource, indexMap } =
    normalizeForMatching(strippedSource);

  const alphaNum = normQuote.replace(/[‑— ]/g, "");
  const startAlphaNumIndex = alphaNumSource.indexOf(alphaNum);
  const endAlphaNumIndex = startAlphaNumIndex + alphaNum.length - 1;

  let startIndex = indexMap[startAlphaNumIndex]!;
  let endIndex = indexMap[endAlphaNumIndex]!;

  while (
    startIndex > 0 &&
    !/[a-z0-9‑— “”‘’]/.test(strippedSource[startIndex - 1]!)
  ) {
    startIndex--;
  }

  while (
    endIndex < strippedSource.length - 1 &&
    !/[a-z0-9‑— “”‘’,]/.test(strippedSource[endIndex + 1]!)
  ) {
    endIndex++;
  }

  if (
    !/[a-z0-9]/.test(strippedSource.slice(0, startIndex)) &&
    !/[a-z0-9]/.test(strippedSource.slice(endIndex))
  ) {
    startIndex = 0;
    endIndex = strippedSource.length - 1;
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

const links = new Map();
const checkDoReference = (
  quoteId: string,
  sourceId: string,
  quoteYears: [number, number],
  sourceYears: [number, number]
) => {
  if (
    quoteId !== sourceId &&
    quoteYears[1] >= sourceYears[0] &&
    !(links.get(quoteId) || []).includes(sourceId)
  ) {
    links.set(sourceId, [...(links.get(sourceId) || []), quoteId]);
    return true;
  }
  return false;
};

const getText = (p: SectionContent) => {
  if (typeof p === "string") return p;
  if (Array.isArray(p)) return "";
  if ("type" in p && p.type === "break") return "";
  return p.text;
};

const getDataQuote = (
  data: any,
  p: {
    section: string;
    paragraph: number;
    start: number;
    end: number;
  }
): string => {
  const source = data.find((d: any) => d.id === p.section)!;
  return getDataText(data, source.content[p.paragraph]!).slice(p.start, p.end);
};

const getDataText = (data: any, c: SectionContent): string => {
  if (typeof c === "string") return c;
  if (!Array.isArray(c)) {
    if ("type" in c && c.type === "break") return "";
    return c.text;
  }
  return c
    .map((p) => (typeof p === "string" ? p : getDataQuote(data, p)))
    .join("");
};

const linkContent = (sections: Section[]) => {
  sections.sort((a, b) => a.years[0] - b.years[0]);

  const ngramMap = new Map();
  const strippedMap = new Map();
  for (const section of sections) {
    if (!section.meta) {
      section.content.forEach((p, i) => {
        const text = getText(p);
        strippedMap.set(`${section.id}:${i}`, strip(text));
        const parts = splitQuoted(text).flatMap((p) =>
          p.split(/( ?\. \. \. ?| ?\[[^\]]*\] ?)/)
        );
        parts.forEach((partText) => {
          const norm = normalise(strip(partText));
          const ngrams = getNGrams(norm);
          for (const ng of ngrams) {
            ngramMap.set(
              ng,
              [
                ...(ngramMap.get(ng) || []),
                {
                  section: section.id,
                  paragraph: i,
                  years: section.years,
                },
              ].sort((a, b) => a.years[0] - b.years[0])
            );
          }
        });
      });
    }
  }
  const clearNgrams = (
    ngrams: string[],
    sectionId: string,
    paragraph: number
  ) => {
    for (const ng of ngrams) {
      if (ngramMap.has(ng)) {
        ngramMap.set(
          ng,
          ngramMap
            .get(ng)
            .filter(
              (x: any) =>
                !(x.section === sectionId && x.paragraph === paragraph)
            )
        );
      }
    }
  };

  const processPara = (
    section: Section,
    p: SectionContent,
    paraIndex: number
  ) => {
    {
      const text = getText(p);
      if (!text) return p;

      const fullStripped = strip(text);
      const fullNorm = normalise(strip(fullStripped));
      const fullNgrams = getNGrams(fullNorm);
      for (const ng of fullNgrams) {
        if (ngramMap.has(ng)) {
          for (const { years, ...source } of ngramMap.get(ng)) {
            if (
              checkDoReference(section.id, source.section, section.years, years)
            ) {
              const normSource = normalise(
                strippedMap.get(`${source.section}:${source.paragraph}`)
              );
              if (
                normSource
                  .replace(/[‑— ]/g, "")
                  .includes(fullNorm.replace(/[‑— ]/g, ""))
              ) {
                clearNgrams(fullNgrams, section.id, paraIndex);
                processSection(source.section);
                const [start, end] = findQuoteIndices(
                  strippedMap.get(`${source.section}:${source.paragraph}`),
                  fullNorm
                );
                return [{ ...source, start, end }];
              }
            }
          }
        }
      }

      const parts = splitQuoted(text).flatMap((p) =>
        p.split(/( ?\. \. \. ?| ?\[[^\]]*\] ?)/)
      );

      const processedParts = parts.map((partText) => {
        const norm = normalise(strip(partText));
        const ngrams = getNGrams(norm);
        if (ngrams.length === 0) return partText;

        for (const ng of ngrams) {
          if (ngramMap.has(ng)) {
            for (const { years, ...source } of ngramMap.get(ng)) {
              if (
                checkDoReference(
                  section.id,
                  source.section,
                  section.years,
                  years
                )
              ) {
                const normSource = normalise(
                  strippedMap.get(`${source.section}:${source.paragraph}`)
                );
                if (
                  normSource
                    .replace(/[‑— ]/g, "")
                    .includes(norm.replace(/[‑— ]/g, ""))
                ) {
                  clearNgrams(ngrams, section.id, paraIndex);
                  processSection(source.section);
                  const [start, end] = findQuoteIndices(
                    strippedMap.get(`${source.section}:${source.paragraph}`),
                    norm
                  );
                  return { ...source, start, end };
                }
              }
            }
          }
        }

        return partText;
      });

      for (let i = processedParts.length - 1; i >= 0; i -= 1) {
        if (typeof processedParts[i] !== "string") {
          [-1, 1].forEach((dir) => {
            for (let j = i + dir; j >= 0; j += dir) {
              if (typeof processedParts[j] === "string") {
                const norm = normalise(strip(processedParts[j] as string));
                if (/[a-z]/.test(norm)) {
                  const normSource = normalise(
                    strippedMap.get(
                      `${processedParts[i].section}:${processedParts[i].paragraph}`
                    )
                  );
                  if (
                    normSource
                      .replace(/[‑— ]/g, "")
                      .includes(norm.replace(/[‑— ]/g, ""))
                  ) {
                    clearNgrams(getNGrams(norm), section.id, paraIndex);
                    const [start, end] = findQuoteIndices(
                      strippedMap.get(
                        `${processedParts[i].section}:${processedParts[i].paragraph}`
                      ),
                      norm
                    );
                    processedParts[j] = {
                      ...processedParts[i],
                      start,
                      end,
                    };
                  }
                }
              } else {
                break;
              }
            }
          });
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
          typeof p === "string" ? p : { ...p, stripped: undefined }
        )
        .filter((p: any) => p);

      return result.length === 1 && typeof result[0] === "string" ? p : result;
    }
  };

  const processedSet = new Set();
  const processSection = (sectionId: string) => {
    if (!processedSet.has(sectionId)) {
      processedSet.add(sectionId);
      const section = sections.find((s) => s.id === sectionId)!;
      if (
        (!["Bahá’u’lláh", "The Báb"].includes(section.path[0]![0]) ||
          ["Gleanings from the Writings of Bahá’u’lláh"].includes(
            section.path[1]![0]
          )) &&
        !section.prayer
      ) {
        section.content = section.content.map((p, paraIndex) => {
          const res = processPara(section, p, paraIndex);
          strippedMap.set(
            `${section.id}:${paraIndex}`,
            strip(getDataText(sections, res))
          );
          return res;
        });
      }
    }
  };
  for (const s of sections.reverse()) processSection(s.id);
};

(async () => {
  const allStructure: any[] = [];
  // const allDouble: any[] = [];

  for (const author of Object.keys(sources)) {
    await Promise.all(
      Object.keys(sources[author]!).map(async (file) => {
        const id = `${author}-${file}`;
        const structure = (await readJSON("structure", id)) as any[];
        allStructure.push(...structure);
        // const double = (await readJSON("structure", id)) as any[];
        // allDouble.push(...double);
      })
    );
  }

  linkContent(allStructure);
  allStructure.sort((a, b) => a.id.localeCompare(b.id));

  // allDouble.sort((a, b) => a.id.localeCompare(b.id));

  // const diffs = [] as any[];
  // for (let i = 0; i < allDouble.length - 1; i++) {
  //   for (let j = 0; j < allDouble[i]!.content.length; j++) {
  //     let s1 = strip(getDataText(allStructure, allStructure[i].content[j]));
  //     let s2 = strip(getDataText(allDouble, allDouble[i].content[j]));
  //     if (s1.replace(/[^a-z0-9]/g, " ") !== s2.replace(/[^a-z0-9]/g, " ")) {
  //       diffs.push({ section: allDouble[i].id, paragraph: j, s1, s2 });
  //     }
  //   }
  // }
  // for (const d of diffs) {
  //   for (const section of allStructure) {
  //     for (const para of section.content) {
  //       if (
  //         Array.isArray(para) &&
  //         para.some(
  //           (p) =>
  //             typeof p !== "string" &&
  //             p.section === d.section &&
  //             p.paragraph === d.paragraph
  //         )
  //       ) {
  //         console.log(d);
  //       }
  //     }
  //   }
  // }

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
