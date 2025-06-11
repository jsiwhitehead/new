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
  const words = norm.split(/[‑— ]+/).filter((w) => w);
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
  strippedQuote: string
): [number, number] => {
  const { alphaNum: alphaNumSource, indexMap } =
    normalizeForMatching(strippedSource);

  const alphaNum = normalise(strippedQuote).replace(/[‑— ]/g, "");
  const startAlphaNumIndex = alphaNumSource.indexOf(alphaNum);
  const endAlphaNumIndex = startAlphaNumIndex + alphaNum.length - 1;

  let startIndex = indexMap[startAlphaNumIndex]!;
  let endIndex = indexMap[endAlphaNumIndex]!;

  const preChars = strippedQuote.match(/^([^a-z0-9]*)/)![1]!;
  if (
    strippedSource.slice(startIndex - preChars.length, startIndex) === preChars
  ) {
    startIndex = startIndex - preChars.length;
  } else {
    if (strippedQuote.startsWith(". . . ")) {
      const preChars2 = strippedQuote.match(/^\. \. \. ([^a-z0-9]*)/)![1]!;
      if (
        strippedSource.slice(startIndex - preChars2.length, startIndex) ===
        preChars2
      ) {
        startIndex = startIndex - preChars2.length;
      } else {
        // console.log(
        //   `DIFF PRE: "${strippedSource.slice(startIndex - preChars2.length, startIndex)}" - "${preChars2}"`
        // );
        // console.log(strippedSource);
        // console.log(strippedQuote);
      }
    } else {
      // console.log(
      //   `DIFF PRE: "${strippedSource.slice(startIndex - preChars.length, startIndex)}" - "${preChars}"`
      // );
      // console.log(strippedSource);
      // console.log(strippedQuote);
    }
  }

  const postChars = strippedQuote.match(/([^a-z0-9]*)$/)![1]!;
  if (
    strippedSource.slice(endIndex + 1, endIndex + 1 + postChars.length) ===
    postChars
  ) {
    endIndex = endIndex + postChars.length;
  } else {
    if (strippedQuote.endsWith(" . . .")) {
      const postChars2 = strippedQuote.match(/([^a-z0-9]*) \. \. \.$/)![1]!;
      if (
        strippedSource.slice(endIndex + 1, endIndex + 1 + postChars2.length) ===
        postChars2
      ) {
        endIndex = endIndex + postChars2.length;
      } else {
        // console.log(
        //   `DIFF POST 2: "${strippedSource.slice(endIndex + 1, endIndex + 1 + postChars2.length)}" - "${postChars2}"`
        // );
        // console.log(strippedSource);
        // console.log(strippedQuote);
      }
    } else {
      // console.log(
      //   `DIFF POST: "${strippedSource.slice(endIndex + 1, endIndex + 1 + postChars.length)}" - "${postChars}"`
      // );
      // console.log(strippedSource);
      // console.log(strippedQuote);
    }
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
      result.push(char);
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
      result[result.length - 1] += char;
      result.push("");
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

(async () => {
  const sections: Section[] = [];

  for (const author of Object.keys(sources)) {
    await Promise.all(
      Object.keys(sources[author]!).map(async (file) => {
        const id = `${author}-${file}`;
        const structure = (await readJSON("structure", id)) as any[];
        sections.push(...structure);
      })
    );
  }

  sections.sort((a, b) => a.years[0] - b.years[0]);

  const ngramMap = new Map();
  const strippedMap = new Map();
  for (const section of sections) {
    if (!section.meta && !["4/2/2/53/1", "4/2/2/54/1"].includes(section.id)) {
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

  const processPart = (
    section: Section,
    paraIndex: number,
    stripped: string,
    norm: string,
    {
      years,
      ...source
    }: { section: string; paragraph: number; years: [number, number] }
  ) => {
    const normSource = normalise(
      strippedMap.get(`${source.section}:${source.paragraph}`)
    );
    if (normSource.replace(/[‑— ]/g, "").includes(norm.replace(/[‑— ]/g, ""))) {
      processSection(source.section);
      const ngrams = getNGrams(norm);
      if (
        ngrams.some((ng) =>
          ngramMap
            .get(ng)
            ?.some(
              (x: any) =>
                x.section === source.section && x.paragraph === source.paragraph
            )
        )
      ) {
        clearNgrams(ngrams, section.id, paraIndex);
        const [start, end] = findQuoteIndices(
          strippedMap.get(`${source.section}:${source.paragraph}`),
          stripped
        );
        return { ...source, start, end };
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

      const parts = splitQuoted(text)
        .flatMap((p) => p.split(/( ?\. \. \. ?| ?\[[^\]]*\] ?)/))
        .filter((p: any) => p);

      const allSources = [
        ...new Set(
          parts.flatMap((partText) =>
            getNGrams(normalise(strip(partText))).flatMap((ng) =>
              (ngramMap.get(ng) || [])
                .filter((x: any) => x.section !== section.id)
                .flatMap((x: any) => JSON.stringify(x))
            )
          )
        ),
      ];
      if (allSources.length === 0) return p;

      for (const source of allSources.map((s) => JSON.parse(s))) {
        if (
          checkDoReference(
            section.id,
            source.section,
            section.years,
            source.years
          )
        ) {
          const processFull = processPart(
            section,
            paraIndex,
            strip(text),
            normalise(strip(text)),
            source
          );
          if (processFull) {
            if (
              strip(text).startsWith(". . . ") &&
              !strippedMap
                .get(`${processFull.section}:${processFull.paragraph}`)
                .slice(processFull.start, processFull.end)
                .startsWith(". . . ")
            ) {
              return [". . . ", processFull];
            }
            if (
              strip(text).endsWith(" . . .") &&
              !strippedMap
                .get(`${processFull.section}:${processFull.paragraph}`)
                .slice(processFull.start, processFull.end)
                .endsWith(" . . .")
            ) {
              return [processFull, " . . ."];
            }
            return [processFull];
          }

          const allProcessed = parts.map(
            (partText) =>
              processPart(
                section,
                paraIndex,
                strip(partText),
                normalise(strip(partText)),
                source
              ) || partText
          );

          for (let i = allProcessed.length - 1; i >= 0; i -= 1) {
            const base = allProcessed[i]!;
            if (typeof base !== "string") {
              [-1, 1].forEach((dir) => {
                for (let j = i + dir; j >= 0; j += dir) {
                  const current = allProcessed[j];
                  if (typeof current === "string") {
                    const stripped = strip(current);
                    if (/[a-z0-9]/.test(stripped.replace(/\[[^\]]*\]/g, ""))) {
                      if (stripped.split(/ /g).length < 5) {
                        const sourceStripped = strippedMap.get(
                          `${base.section}:${base.paragraph}`
                        );
                        if (sourceStripped.includes(stripped)) {
                          allProcessed[j] = {
                            ...base,
                            start: sourceStripped.indexOf(stripped),
                            end:
                              sourceStripped.indexOf(stripped) +
                              stripped.length,
                          };
                        }
                      } else {
                        const norm = normalise(strip(current));
                        const normSource = normalise(
                          strippedMap.get(`${base.section}:${base.paragraph}`)
                        );
                        if (
                          normSource
                            .replace(/[‑— ]/g, "")
                            .includes(norm.replace(/[‑— ]/g, ""))
                        ) {
                          clearNgrams(getNGrams(norm), section.id, paraIndex);
                          const [start, end] = findQuoteIndices(
                            strippedMap.get(
                              `${base.section}:${base.paragraph}`
                            ),
                            strip(current)
                          );
                          allProcessed[j] = {
                            ...base,
                            start,
                            end,
                          };
                        }
                      }
                    }
                  } else {
                    break;
                  }
                }
              });
            }
          }

          if (
            allProcessed.every(
              (processed) =>
                typeof processed !== "string" ||
                !/[a-z0-9]/.test(strip(processed).replace(/\[[^\]]*\]/g, ""))
            )
          ) {
            return allProcessed.reduce((res, part) => {
              if (
                typeof part === "string" &&
                typeof res[res.length - 1] === "string"
              ) {
                res[res.length - 1] += part;
              } else {
                res.push(part);
              }
              return res;
            }, [] as any[]);
          }
        }
      }

      const processedParts = parts.map((partText) => {
        const norm = normalise(strip(partText));
        const ngrams = getNGrams(norm);
        if (ngrams.length === 0) return partText;

        for (const ng of ngrams) {
          if (ngramMap.has(ng)) {
            for (const source of ngramMap.get(ng)) {
              if (
                checkDoReference(
                  section.id,
                  source.section,
                  section.years,
                  source.years
                )
              ) {
                const processed = processPart(
                  section,
                  paraIndex,
                  strip(partText),
                  norm,
                  source
                );
                if (processed) return processed;
              }
            }
          }
        }

        return partText;
      });

      for (let i = processedParts.length - 1; i >= 0; i -= 1) {
        const base = processedParts[i]!;
        if (typeof base !== "string") {
          [-1, 1].forEach((dir) => {
            for (let j = i + dir; j >= 0; j += dir) {
              const current = processedParts[j];
              if (
                typeof current === "string" &&
                !(current[0] === "”" && current[current.length - 1] === "“")
              ) {
                const stripped = strip(current);
                if (/[a-z0-9]/.test(stripped.replace(/\[[^\]]*\]/g, ""))) {
                  const norm = normalise(strip(current));
                  const normSource = normalise(
                    strippedMap.get(`${base.section}:${base.paragraph}`)
                  );
                  if (
                    normSource
                      .replace(/[‑— ]/g, "")
                      .includes(norm.replace(/[‑— ]/g, ""))
                  ) {
                    clearNgrams(getNGrams(norm), section.id, paraIndex);
                    const [start, end] = findQuoteIndices(
                      strippedMap.get(`${base.section}:${base.paragraph}`),
                      strip(current)
                    );
                    processedParts[j] = {
                      ...base,
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

      const result = processedParts.reduce((res, part) => {
        if (
          typeof part === "string" &&
          typeof res[res.length - 1] === "string"
        ) {
          res[res.length - 1] += part;
        } else {
          res.push(part);
        }
        return res;
      }, [] as any[]);

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

  sections.sort((a, b) => a.id.localeCompare(b.id));

  const allQuoted = sections.flatMap((section: Section) =>
    section.content.flatMap((c, i) =>
      Array.isArray(c)
        ? c
            .filter((a) => typeof a !== "string")
            .map((a) => ({ ...a, refSection: section.id, refParagraph: i }))
        : []
    )
  );
  for (const section of sections) {
    const sectionQuoted = allQuoted.filter((a) => a.section === section.id);
    const quoted = {} as any;
    section.content.forEach((_: any, i: any) => {
      const stripped = strippedMap.get(`${section.id}:${i}`);
      const paraQuoted = sectionQuoted.filter((a) => a.paragraph === i);
      if (paraQuoted.length > 0) {
        const paras = [
          ...new Set(
            paraQuoted.map((q) => `${q.refSection}:${q.refParagraph}`)
          ),
        ];
        quoted[i] = paras.flatMap((para) => {
          const quoted = paraQuoted.filter(
            (q) => `${q.refSection}:${q.refParagraph}` === para
          );
          const [refSection, refParagraph] = para.split(":") as any;
          quoted.sort((a, b) => a.start - b.start);
          const merged = [quoted[0]!];
          for (let j = 1; j < quoted.length; j++) {
            const last = merged[merged.length - 1]!;
            const current = quoted[j]!;
            if (
              current.start <= last.end ||
              !/[a-z0-9]/.test(
                stripped
                  .slice(last.end, current.start)
                  .replace(/\[[^\]]*\]/g, "")
              )
            ) {
              last.end = Math.max(last.end, current.end);
            } else {
              merged.push(current);
            }
          }
          return merged.map((q) => ({
            start: q.start,
            end: q.end,
            section: refSection,
            paragraph: refParagraph,
          }));
        });
      }
    });
    if (sectionQuoted.length > 0) {
      const content = section.content;
      delete (section as any).content;
      section.quoted = quoted;
      section.content = content;
    }
  }

  await writeJSON(
    "",
    "data",
    sections.sort((aDoc, bDoc) => {
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
