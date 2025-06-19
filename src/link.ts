import sources from "./sources";
import type { Section, SectionContent } from "./structure";
import { readJSON, writeJSON } from "./utils";

const comparePathNums = (a: number[], b: number[]) => {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const aVal = a[i];
    const bVal = b[i];

    if (aVal === undefined) return -1;
    if (bVal === undefined) return 1;

    if (aVal !== bVal && aVal === 0) return 1;
    if (aVal !== bVal && bVal === 0) return -1;

    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
  }
  return 0;
};

const strip = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const normalise = (stripped: string) => stripped.replace(/[^a-z0-9‑— ]/g, "");

const getNGrams = (norm: string, n = 7) => {
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
): { start: number; end: number; pre: string; post: string } => {
  const { alphaNum: alphaNumSource, indexMap } =
    normalizeForMatching(strippedSource);

  const alphaNum = normalise(strippedQuote).replace(/[‑— ]/g, "");
  const startAlphaNumIndex = alphaNumSource.indexOf(alphaNum);
  const endAlphaNumIndex = startAlphaNumIndex + alphaNum.length - 1;

  let start = indexMap[startAlphaNumIndex]!;
  let end = indexMap[endAlphaNumIndex]!;

  let pre = strippedQuote.match(/^([^a-z0-9]*)/)![1]!;
  while (start > 0 && strippedSource[start - 1] === pre[pre.length - 1]) {
    start -= 1;
    pre = pre.slice(0, -1);
  }
  if (strippedSource[start] === " ") {
    start += 1;
    pre = `${pre} `;
  }

  let post = strippedQuote.match(/([^a-z0-9]*)$/)![1]!;
  while (
    end < strippedSource.length - 1 &&
    strippedSource[end + 1] === post[0]
  ) {
    end += 1;
    post = post.slice(1);
  }
  if (strippedSource[end] === " ") {
    end -= 1;
    post = ` ${post}`;
  }

  return { start, end: end + 1, pre, post };
};

const splitQuoted = (text: string): string[] => {
  const result: string[] = [""];
  let expectedCloseQuote: string | null = null;
  const quotePairs: Record<string, string> = { "“": "”" };
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
      !/[a-z‑]/.test(strip(text[i - 1] || " "))
    ) {
      result[result.length - 1] += char;
      result.push("");
      expectedCloseQuote = quotePairs[char];
    } else {
      result[result.length - 1] += char;
    }
  }
  return result;
};

const links = new Map();
const checkDoReference = (
  quoteId: number,
  sourceId: number,
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
    section: number;
    paragraph: number;
    start: number;
    end: number;
  }
): string => {
  const source = data[p.section];
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

function getRangeIntersection(
  start1: number,
  end1: number,
  start2: number,
  end2: number
) {
  const start = Math.max(start1, start2);
  const end = Math.min(end1, end2);
  if (start < end) return { start, end };
  else return null;
}

const getAllQuotes = (
  data: Section[],
  quote: {
    start: number;
    end: number;
    section: number;
    paragraph: number;
    refStart: number;
    refEnd: number;
  }
): {
  start: number;
  end: number;
  section: number;
  paragraph: number;
  refStart: number;
  refEnd: number;
}[] => {
  const offset = quote.start - quote.refStart;
  return [
    quote,
    ...((data[quote.section]!.quoted || {})[quote.paragraph] || []).flatMap(
      (q2) => {
        const overlap = getRangeIntersection(
          quote.refStart,
          quote.refEnd,
          q2.start,
          q2.end
        );
        if (!overlap) return [];
        return getAllQuotes(data, {
          start: overlap.start + offset,
          end: overlap.end + offset,
          section: q2.section,
          paragraph: q2.paragraph,
          refStart: overlap.start,
          refEnd: overlap.end,
        });
      }
    ),
  ];
};

(async () => {
  const sections: Section[] = [];

  for (const author of Object.keys(sources)) {
    await Promise.all(
      Object.keys(sources[author]!).map(async (file) => {
        const id = `${author}-${file}`;
        const structure = await readJSON("structure", id);
        if (structure) sections.push(...structure);
      })
    );
  }
  sections.push(...(await readJSON("structure", "additional")));
  sections.push(...(await readJSON("structure", "prayers")));
  sections.push(...(await readJSON("structure", "shoghi-effendi-messages")));

  sections.sort((aDoc, bDoc) =>
    comparePathNums(
      aDoc.path.map((p: [string, string, number]) => p[2]),
      bDoc.path.map((p: [string, string, number]) => p[2])
    )
  );

  const sectionsAndIndices = sections.map((section, index) => ({
    section,
    index,
  }));
  sectionsAndIndices.sort((a, b) => a.section.years[0] - b.section.years[0]);

  const ngramMap = new Map();
  const ngramMapBackup = new Map();
  const strippedMap = new Map();
  sectionsAndIndices.forEach(({ section, index }) => {
    if (
      section.path[0]![0] !== "Compilations" &&
      !(
        section.path[0]![0] === "Ruhi Institute" &&
        section.path[2]?.[0] !== "A Few Thoughts for the Tutor"
      )
    ) {
      section.content.forEach((p, i) => {
        const text = getText(p);
        strippedMap.set(`${index}:${i}`, strip(text));
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
                  section: index,
                  paragraph: i,
                  years: section.years,
                },
              ].sort((a, b) => a.years[0] - b.years[0])
            );
            ngramMapBackup.set(
              ng,
              [
                ...(ngramMapBackup.get(ng) || []),
                {
                  section: index,
                  paragraph: i,
                  years: section.years,
                },
              ].sort((a, b) => a.years[0] - b.years[0])
            );
          }
        });
      });
    }
  });
  const clearNgrams = (
    ngrams: string[],
    sectionId: number,
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
    sectionIndex: number,
    paraIndex: number,
    stripped: string,
    norm: string,
    {
      years,
      ...source
    }: { section: number; paragraph: number; years: [number, number] },
    isFull?: true
  ) => {
    const strippedSource = strippedMap.get(
      `${source.section}:${source.paragraph}`
    );
    const normSource = normalise(strippedSource);
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
        const { start, end, pre, post } = findQuoteIndices(
          strippedSource,
          stripped
        );
        if (
          isFull ||
          !(strippedSource[start - 1] === "“" && strippedSource[end] === "”")
        ) {
          clearNgrams(ngrams, sectionIndex, paraIndex);
          return { quote: { ...source, start, end }, pre, post };
        }
      }
    }
  };

  const processPara = (
    section: Section,
    sectionIndex: number,
    p: SectionContent,
    paraIndex: number
  ) => {
    {
      const text = getText(p);
      if (typeof p !== "string" && !Array.isArray(p)) return p;

      const parts = splitQuoted(text)
        .flatMap((p) => p.split(/( ?\. \. \. ?| ?\[[^\]]*\] ?)/))
        .filter((p: any) => p);

      const allSources = [
        ...new Set(
          parts.flatMap((partText) =>
            getNGrams(normalise(strip(partText))).flatMap((ng) =>
              (ngramMap.get(ng) || [])
                .filter((x: any) => x.section !== sectionIndex)
                .flatMap((x: any) => JSON.stringify(x))
            )
          )
        ),
      ];
      if (allSources.length === 0) return p;

      for (const source of allSources.map((s) => JSON.parse(s))) {
        if (
          checkDoReference(
            sectionIndex,
            source.section,
            section.years,
            source.years
          )
        ) {
          const processFull = processPart(
            sectionIndex,
            paraIndex,
            strip(text),
            normalise(strip(text)),
            source,
            true
          );
          if (processFull) {
            return [
              processFull.pre,
              processFull.quote,
              processFull.post,
            ].filter((p: any) => p);
          }
        }
      }

      if (!/\[[^\]]*\]/.test(text) && !/\. \. \./.test(text)) {
        const allSourcesBackup = [
          ...new Set(
            parts.flatMap((partText) =>
              getNGrams(normalise(strip(partText))).flatMap((ng) =>
                (ngramMapBackup.get(ng) || [])
                  .filter((x: any) => x.section !== sectionIndex)
                  .flatMap((x: any) => JSON.stringify(x))
              )
            )
          ),
        ].filter((x) => !allSources.includes(x));

        for (const source of allSourcesBackup.map((s) => JSON.parse(s))) {
          if (
            checkDoReference(
              sectionIndex,
              source.section,
              section.years,
              source.years
            )
          ) {
            const stripped = strip(text);
            const norm = normalise(strip(text));
            const strippedSource = strippedMap.get(
              `${source.section}:${source.paragraph}`
            );
            const normSource = normalise(strippedSource);
            if (
              normSource
                .replace(/[‑— ]/g, "")
                .includes(norm.replace(/[‑— ]/g, ""))
            ) {
              const { start, end, pre, post } = findQuoteIndices(
                strippedSource,
                stripped
              );
              const ngrams = getNGrams(norm);
              clearNgrams(ngrams, sectionIndex, paraIndex);
              return [pre, { ...source, start, end }, post].filter(
                (p: any) => p
              );
            }
          }
        }
      }

      for (const source of allSources.map((s) => JSON.parse(s))) {
        if (
          checkDoReference(
            sectionIndex,
            source.section,
            section.years,
            source.years
          )
        ) {
          let allProcessed = parts.flatMap((partText) => {
            const processed = processPart(
              sectionIndex,
              paraIndex,
              strip(partText),
              normalise(strip(partText)),
              source
            );
            if (!processed) return [partText];
            return [processed.pre, processed.quote, processed.post];
          });

          const allInserts: Record<string, { pre: string; post: string }> = {};
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
                          clearNgrams(getNGrams(norm), sectionIndex, paraIndex);
                          const { start, end, pre, post } = findQuoteIndices(
                            strippedMap.get(
                              `${base.section}:${base.paragraph}`
                            ),
                            strip(current)
                          );
                          allInserts[j] = { pre, post };
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
          allProcessed = allProcessed.flatMap((x, i) =>
            allInserts[i] ? [allInserts[i].pre, x, allInserts[i].post] : [x]
          );

          if (
            allProcessed.every(
              (processed) =>
                typeof processed !== "string" ||
                !/[a-z0-9]/.test(strip(processed).replace(/\[[^\]]*\]/g, ""))
            )
          ) {
            return allProcessed
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
              .filter((p: any) => p);
          }
        }
      }

      let processedParts = parts.flatMap((partText) => {
        const norm = normalise(strip(partText));
        const ngrams = getNGrams(norm);
        if (ngrams.length === 0) return [partText];

        for (const ng of ngrams) {
          if (ngramMap.has(ng)) {
            for (const source of ngramMap.get(ng)) {
              if (
                checkDoReference(
                  sectionIndex,
                  source.section,
                  section.years,
                  source.years
                )
              ) {
                const processed = processPart(
                  sectionIndex,
                  paraIndex,
                  strip(partText),
                  norm,
                  source
                );
                if (processed) {
                  return [processed.pre, processed.quote, processed.post];
                }
              }
            }
          }
        }

        return [partText];
      });

      const partInserts: Record<string, { pre: string; post: string }> = {};
      for (let i = processedParts.length - 1; i >= 0; i -= 1) {
        const base = processedParts[i]!;
        if (typeof base !== "string") {
          [-1, 1].forEach((dir) => {
            for (let j = i + dir; j >= 0; j += dir) {
              const current = processedParts[j];
              if (typeof current === "string") {
                if (
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
                      clearNgrams(getNGrams(norm), sectionIndex, paraIndex);
                      const { start, end, pre, post } = findQuoteIndices(
                        strippedMap.get(`${base.section}:${base.paragraph}`),
                        strip(current)
                      );
                      partInserts[j] = { pre, post };
                      processedParts[j] = {
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
      processedParts = processedParts.flatMap((x, i) =>
        partInserts[i] ? [partInserts[i].pre, x, partInserts[i].post] : [x]
      );

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
        .filter((p: any) => p);

      return result.length === 1 && typeof result[0] === "string" ? p : result;
    }
  };

  const processedSet = new Set();
  const processSection = (sectionIndex: number) => {
    if (!processedSet.has(sectionIndex)) {
      processedSet.add(sectionIndex);
      const section = sections[sectionIndex]!;
      if (
        (!["Bahá’u’lláh", "The Báb"].includes(section.path[0]![0]) ||
          ["Gleanings from the Writings of Bahá’u’lláh"].includes(
            section.path[1]![0]
          )) &&
        !section.prayer
      ) {
        section.content = section.content.map((p, paraIndex) => {
          const res = processPara(section, sectionIndex, p, paraIndex);
          strippedMap.set(
            `${sectionIndex}:${paraIndex}`,
            strip(getDataText(sections, res))
          );
          return res;
        });
        for (let i = 0; i < section.content.length; i++) {
          const base = section.content[i];
          if (
            Array.isArray(base) &&
            base.filter((x) => typeof x !== "string").length === 1
          ) {
            const baseSource = base.find((x) => typeof x !== "string")!;
            for (const dir of [-1, 1]) {
              for (
                let j = i + dir;
                j >= 0 && j < section.content.length;
                j += dir
              ) {
                const current = section.content[j]!;
                const text = getDataText(sections, current);
                const stripped = strip(text);
                const norm = normalise(stripped);
                if (/[a-z0-9]/.test(norm)) {
                  const strippedSource =
                    strippedMap.get(
                      `${baseSource.section}:${baseSource.paragraph + (j - i)}`
                    ) || "";
                  const normSource = normalise(strippedSource);
                  if (
                    normSource
                      .replace(/[‑— ]/g, "")
                      .includes(norm.replace(/[‑— ]/g, ""))
                  ) {
                    const { start, end, pre, post } = findQuoteIndices(
                      strippedSource,
                      stripped
                    );
                    const ngrams = getNGrams(norm);
                    clearNgrams(ngrams, sectionIndex, j);
                    section.content[j] = [
                      pre,
                      {
                        ...baseSource,
                        paragraph: baseSource.paragraph + (j - i),
                        start,
                        end,
                      },
                      post,
                    ].filter((x) => x);
                    strippedMap.set(
                      `${sectionIndex}:${j}`,
                      strip(getDataText(sections, section.content[j]!))
                    );
                  } else {
                    break;
                  }
                } else {
                  break;
                }
              }
            }
          }
        }
        //   let changed = true;
        //   while (changed) {
        //     changed = false;

        //     section.content = section.content.map((p, paraIndex) => {
        //       const text = getDataText(sections, p);
        //       const stripped = strip(text);
        //       const norm = normalise(stripped);
        //       const currentSource =
        //         Array.isArray(p) && p.find((x) => typeof x !== "string");
        //       if (/[a-z0-9]/.test(norm)) {
        //         for (const dir of [-1, 1]) {
        //           if (Array.isArray(section.content[paraIndex + dir])) {
        //             const source = (section.content[paraIndex + dir] as any).find(
        //               (x: any) => typeof x !== "string"
        //             );
        //             if (
        //               !currentSource ||
        //               currentSource.section !== source.section
        //             ) {
        //               const strippedSource =
        //                 strippedMap.get(
        //                   `${source.section}:${source.paragraph - dir}`
        //                 ) || "";
        //               const normSource = normalise(strippedSource);

        //             }
        //           }
        //         }
        //       }
        //       return p;
        //     });
        //   }
      }
    }
  };
  for (let sIndex = sections.length - 1; sIndex >= 0; sIndex--) {
    processSection(sIndex);
  }

  const allQuoted = sections.flatMap((section: Section, sIndex: number) =>
    section.content.flatMap((c, i) => {
      if (!Array.isArray(c)) return [];
      let index = 0;
      return c.flatMap((a) => {
        const text = typeof a === "string" ? a : getDataQuote(sections, a);
        const start = index;
        index += text.length;
        if (typeof a === "string") return [];
        return [
          {
            ...a,
            refSection: sIndex,
            refParagraph: i,
            refStart: start,
            refEnd: index,
          },
        ];
      });
    })
  );
  sections.forEach((section, sIndex) => {
    const sectionQuoted = allQuoted.filter((a) => a.section === sIndex);
    const quoted = {} as any;
    section.content.forEach((_: any, i: any) => {
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
          quoted.sort((a, b) => a.start - b.start);
          return quoted.map((q) => ({
            start: q.start,
            end: q.end,
            section: q.refSection,
            paragraph: q.refParagraph,
            refStart: q.refStart,
            refEnd: q.refEnd,
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
  });

  const mappedQuoted = sections.map((d) =>
    Object.keys(d.quoted || {}).reduce((res, k) => {
      const text = getText(d.content[k as any]!);
      const allQuotes = d.quoted![k]!.flatMap((q) => getAllQuotes(sections, q));
      const allRefs = [
        ...new Set(
          allQuotes.map((q) => JSON.stringify([q.section, q.paragraph]))
        ),
      ].map((x) => JSON.parse(x));
      return {
        ...res,
        [k]: allRefs
          .flatMap((ref) => {
            const [refSection, refParagraph] = ref;
            const refQuotes = allQuotes.filter(
              (q) => q.section === refSection && q.paragraph === refParagraph
            );
            refQuotes.sort((a, b) => a.start - b.start);
            const merged = [refQuotes[0]!];
            for (let j = 1; j < refQuotes.length; j++) {
              const last = merged[merged.length - 1]!;
              const current = refQuotes[j]!;
              if (
                current.start <= last.end ||
                !/[a-z0-9]/.test(
                  text.slice(last.end, current.start).replace(/\[[^\]]*\]/g, "")
                )
              ) {
                last.end = Math.max(last.end, current.end);
              } else {
                merged.push(current);
              }
            }
            return merged;
          })
          .sort((aQuote, bQuote) => {
            const aDoc = sections[aQuote.section]!;
            const bDoc = sections[bQuote.section]!;
            return comparePathNums(
              aDoc.path.map((p: [string, string, number]) => p[2]),
              bDoc.path.map((p: [string, string, number]) => p[2])
            );
          }),
      };
    }, {})
  );
  sections.forEach((d, i) => {
    if (Object.keys(mappedQuoted[i]!).length > 0) {
      d.quoted = mappedQuoted[i];
    }
  });

  await writeJSON("", "data", sections);
})();
