import sources from "./sources";
import type { Quote, RefQuote, Section, SectionContent } from "./structure";
import { readJSON, writeJSON } from "./utils";

interface Ref {
  section: number;
  paragraph: number;
}
interface NGramRef extends Ref {
  years: [number, number];
}

interface Layers {
  text: string;
  cleaned: string;
  words: string;
  chars: string;
  ngrams: string[];
}

const refsEqual = (a: Ref, b: Ref) =>
  a.section === b.section && a.paragraph === b.paragraph;

const uniqueRefs = (arr: Ref[]) => {
  const res: Ref[] = [];
  for (const obj of arr) {
    if (!res.some((x) => refsEqual(x, obj))) res.push(obj);
  }
  return res;
};

const getRangeIntersection = (
  start1: number,
  end1: number,
  start2: number,
  end2: number
) => {
  const start = Math.max(start1, start2);
  const end = Math.min(end1, end2);
  if (start < end) return { start, end };
  else return null;
};

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

const toCleaned = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const toWords = (cleaned: string) =>
  cleaned
    .replace(/[^a-z0-9‑— ]/g, "")
    .replace(/[‑—]/g, " ")
    .replace(/ +/g, " ")
    .trim();

const toChars = (words: string) => words.replace(/ /g, "");

const getNGrams = (words: string, n = 7) => {
  const splitWords = words.split(" ");
  if (splitWords.length < n) return [];
  const ngrams: string[] = [];
  for (let i = 0; i <= splitWords.length - n; i++) {
    ngrams.push(splitWords.slice(i, i + n).join(" "));
  }
  return ngrams;
};

const getLayers = (text: string): Layers => {
  const cleaned = toCleaned(text);
  const words = toWords(cleaned);
  const chars = toChars(words);
  const ngrams = getNGrams(words);
  return { text, cleaned, words, chars, ngrams };
};

const textIsConnector = (cleaned: string) =>
  !/[a-z0-9]/.test(cleaned.replace(/\[[^\]]*\]/g, ""));

const splitQuoted = (text: string): string[] => {
  const result: string[] = [""];
  let expectedCloseQuote: string | null = null;
  const quotePairs: Record<string, string> = { "“": "”" };
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (char === expectedCloseQuote) {
      result.push(char);
      expectedCloseQuote = null;
    } else if (!expectedCloseQuote && quotePairs[char]) {
      result[result.length - 1] += char;
      result.push("");
      expectedCloseQuote = quotePairs[char];
    } else {
      result[result.length - 1] += char;
    }
  }
  return result;
};

const findQuoteIndices = (
  sourceCleaned: string,
  quoteCleaned: string
): { start: number; end: number; pre: string; post: string } => {
  const allSourceChars: string[] = [];
  const indexMap: number[] = [];
  for (let i = 0; i < sourceCleaned.length; i++) {
    const char = sourceCleaned[i]!;
    if (/[a-z0-9]/.test(char)) {
      allSourceChars.push(char.toLowerCase());
      indexMap.push(i);
    }
  }
  const sourceChars = allSourceChars.join("");
  const quoteChars = toChars(toWords(quoteCleaned));
  const startQuoteIndex = sourceChars.indexOf(quoteChars);
  const endQuoteIndex = startQuoteIndex + quoteChars.length - 1;

  let start = indexMap[startQuoteIndex]!;
  let end = indexMap[endQuoteIndex]!;

  let pre = quoteCleaned.match(/^([^a-z0-9]*)/)![1]!;
  while (start > 0 && sourceCleaned[start - 1] === pre[pre.length - 1]) {
    start -= 1;
    pre = pre.slice(0, -1);
  }
  if (sourceCleaned[start] === " ") {
    start += 1;
    pre = `${pre} `;
  }

  let post = quoteCleaned.match(/([^a-z0-9]*)$/)![1]!;
  while (end < sourceCleaned.length - 1 && sourceCleaned[end + 1] === post[0]) {
    end += 1;
    post = post.slice(1);
  }
  if (sourceCleaned[end] === " ") {
    end -= 1;
    post = ` ${post}`;
  }

  return { start, end: end + 1, pre, post };
};

const links = new Map();
const addLink = (quoteIndex: number, sourceIndex: number) =>
  links.set(sourceIndex, [...(links.get(sourceIndex) || []), quoteIndex]);
const checkCanLink = (quoteIndex: number, sourceIndex: number) =>
  !(links.get(quoteIndex) || []).includes(sourceIndex);

const joinStringParts = (parts: (string | Quote)[]) => {
  const res = [];
  for (const part of parts) {
    if (typeof part === "string" && typeof res[res.length - 1] === "string") {
      res[res.length - 1] += part;
    } else {
      res.push(part);
    }
  }
  return res.filter((part) => part);
};

(async () => {
  const baseData: Section[] = [];
  for (const author of Object.keys(sources)) {
    await Promise.all(
      Object.keys(sources[author]!).map(async (file) => {
        const id = `${author}-${file}`;
        const structure = await readJSON("structure", id);
        if (structure) baseData.push(...structure);
      })
    );
  }
  baseData.push(...(await readJSON("structure", "additional")));
  baseData.push(...(await readJSON("structure", "prayers")));
  baseData.push(...(await readJSON("structure", "shoghi-effendi-messages")));
  baseData.sort((aDoc, bDoc) =>
    comparePathNums(
      aDoc.path.map((p: [string, string, number]) => p[2]),
      bDoc.path.map((p: [string, string, number]) => p[2])
    )
  );

  const getQuoteText = (quote: Quote): string =>
    getText(quote).slice(quote.start, quote.end);

  const getText = (ref: Ref) => {
    const para = sections[ref.section]!.content[ref.paragraph]!.para;
    if (typeof para === "string") return para;
    if (!Array.isArray(para)) {
      if ("type" in para && para.type === "break") return "";
      return para.text;
    }
    return para
      .map((part): string =>
        typeof part === "string" ? part : getQuoteText(part)
      )
      .join("");
  };

  const sections = baseData.map((section) => ({
    ...section,
    content: section.content.map((para) => ({
      para,
      ...getLayers(""),
      parts: [] as Layers[],
    })),
  }));

  const canBeAQuote = (sectionIndex: number) => {
    const section = sections[sectionIndex]!;
    return !(
      (["Bahá’u’lláh", "The Báb"].includes(section.path[0]![0]) &&
        section.path[1]![0] !== "Gleanings from the Writings of Bahá’u’lláh") ||
      section.prayer
    );
  };

  const updatePara = (
    ref: { section: number; paragraph: number },
    para: SectionContent
  ) => {
    const base = sections[ref.section]!.content[ref.paragraph]!;
    base.para = para;
    Object.assign(base, getLayers(getText(ref)));
    const parts = splitQuoted(base.text)
      .flatMap((p) => p.split(/( ?\. \. \. ?| ?\[[^\]]*\] ?)/))
      .filter((x) => x);
    base.parts = parts.map((text) => getLayers(text));
  };

  sections.forEach((section, index) => {
    section.content.forEach((para, i) => {
      updatePara({ section: index, paragraph: i }, para.para);
    });
  });

  const yearSortedIndices = baseData
    .map((section, index) => ({ section, index }))
    .sort(
      (a, b) => a.section.years[0] - b.section.years[0] || a.index - b.index
    )
    .map(({ index }) => index);

  const ngramMap = new Map<string, NGramRef[]>();
  yearSortedIndices.forEach((index) => {
    const section = sections[index]!;
    if (
      section.path[0]![0] !== "Compilations" &&
      !(
        section.path[0]![0] === "Ruhi Institute" &&
        section.path[2]?.[0] !== "A Few Thoughts for the Tutor"
      )
    ) {
      section.content.forEach((para, i) => {
        for (const ng of para.ngrams) {
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
        }
      });
    }
  });
  const clearNgrams = (
    ref: { section: number; paragraph: number },
    ngrams: string[]
  ) => {
    for (const ng of ngrams) {
      if (ngramMap.has(ng)) {
        const filtered = ngramMap
          .get(ng)!
          .filter(
            (x) => !(x.section === ref.section && x.paragraph === ref.paragraph)
          );
        ngramMap.set(ng, filtered);
      }
    }
  };
  const ngramMapFull = new Map(ngramMap);

  const getPossibleSources = (
    ref: Ref,
    ngrams: string[],
    full: boolean = false
  ) => {
    const refYears = sections[ref.section]!.years;
    const filtered = ngrams
      .flatMap((ng) =>
        ((full ? ngramMapFull : ngramMap).get(ng) || []).filter(
          (x) => x.section !== ref.section && x.years[0] <= refYears[1]
        )
      )
      .sort(
        (a, b) =>
          a.years[0] - b.years[0] ||
          a.section - b.section ||
          a.paragraph - b.paragraph
      );
    return uniqueRefs(filtered.map(({ years, ...ref }) => ref));
  };

  const processForWhole = (part: Layers, sourceRef: Ref) => {
    const source = sections[sourceRef.section]!.content[sourceRef.paragraph]!;
    if (source.chars.includes(part.chars)) {
      processSection(sourceRef.section);
      if (
        part.ngrams.some((ng) =>
          ngramMap.get(ng)?.some((x) => refsEqual(x, sourceRef))
        )
      ) {
        const { start, end, pre, post } = findQuoteIndices(
          source.cleaned,
          part.cleaned
        );
        return [pre, { ...sourceRef, start, end }, post].filter((p) => p);
      }
    }
  };

  const paraAllQuote = (ref: { section: number; paragraph: number }) => {
    const para = sections[ref.section]!.content[ref.paragraph]!;
    if (typeof para.para !== "string") return;

    const allSources = getPossibleSources(ref, para.ngrams);

    // Whole paragraph quoted from one source
    for (const sourceRef of allSources) {
      const processed = processForWhole(para, sourceRef);
      if (processed) {
        clearNgrams(ref, para.ngrams);
        addLink(ref.section, sourceRef.section);
        return processed;
      }
    }

    // Whole paragraph quoted from one source that is partially a quote itself
    if (!/\[[^\]]*\]/.test(para.text) && !/\. \. \./.test(para.text)) {
      const allSourcesFull = getPossibleSources(ref, para.ngrams);
      for (const sourceRef of allSourcesFull) {
        if (checkCanLink(ref.section, sourceRef.section)) {
          const source =
            sections[sourceRef.section]!.content[sourceRef.paragraph]!;
          if (source.chars.includes(para.chars)) {
            const { start, end, pre, post } = findQuoteIndices(
              source.cleaned,
              para.cleaned
            );
            clearNgrams(ref, para.ngrams);
            addLink(ref.section, sourceRef.section);
            return [pre, { ...sourceRef, start, end }, post].filter((p) => p);
          }
        }
      }
    }

    // Whole paragraph parts quoted from one source
    for (const sourceRef of allSources) {
      let allProcessed = para.parts.flatMap(
        (part) => processForWhole(part, sourceRef) || [part.text]
      );

      // Extending to check small parts
      const allInserts: Record<string, { pre: string; post: string }> = {};
      for (let i = allProcessed.length - 1; i >= 0; i -= 1) {
        const base = allProcessed[i]!;
        if (typeof base !== "string") {
          [-1, 1].forEach((dir) => {
            for (let j = i + dir; j >= 0; j += dir) {
              const current = allProcessed[j];
              if (typeof current === "string") {
                const curr = getLayers(current);
                const source = sections[base.section]!.content[base.paragraph]!;
                if (/[a-z0-9]/.test(curr.cleaned.replace(/\[[^\]]*\]/g, ""))) {
                  if (curr.cleaned.split(/ /g).length < 5) {
                    if (source.cleaned.includes(curr.cleaned)) {
                      allProcessed[j] = {
                        ...base,
                        start: source.cleaned.indexOf(curr.cleaned),
                        end:
                          source.cleaned.indexOf(curr.cleaned) +
                          curr.cleaned.length,
                      };
                    }
                  } else {
                    if (source.chars.includes(curr.chars)) {
                      clearNgrams(ref, curr.ngrams);
                      const { start, end, pre, post } = findQuoteIndices(
                        source.cleaned,
                        curr.cleaned
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
          (p) => typeof p !== "string" || textIsConnector(toCleaned(p))
        )
      ) {
        clearNgrams(ref, para.ngrams);
        addLink(ref.section, sourceRef.section);
        return joinStringParts(allProcessed);
      }
    }
  };

  const processedSet = new Set();
  const processSection = (sectionIndex: number) => {
    if (!processedSet.has(sectionIndex)) {
      processedSet.add(sectionIndex);
      const section = sections[sectionIndex]!;

      if (canBeAQuote(sectionIndex)) {
        console.log(section.path.map((p) => p[0]).join(", "));

        // Whole paragraphs are a quote
        section.content.forEach((_, paraIndex) => {
          const ref = { section: sectionIndex, paragraph: paraIndex };
          const processed = paraAllQuote(ref);
          if (processed) updatePara(ref, processed);
        });

        // Extending to neighbouring quoted paragraphs
        for (let i = 0; i < section.content.length; i++) {
          const base = section.content[i]!;
          if (
            Array.isArray(base.para) &&
            base.para.filter((x) => typeof x !== "string").length === 1
          ) {
            const baseSource = base.para.find((x) => typeof x !== "string")!;
            for (const dir of [-1, 1]) {
              for (
                let j = i + dir;
                j >= 0 && j < section.content.length;
                j += dir
              ) {
                const current = section.content[j]!;
                if (current.chars.length > 0) {
                  const sourceRef = {
                    section: baseSource.section,
                    paragraph: baseSource.paragraph + (j - i),
                  };
                  const source =
                    sections[sourceRef.section]!.content[sourceRef.paragraph]!;
                  if (source?.chars.includes(current.chars)) {
                    const { start, end, pre, post } = findQuoteIndices(
                      source.cleaned,
                      current.cleaned
                    );
                    const currentRef = { section: sectionIndex, paragraph: j };
                    clearNgrams(currentRef, current.ngrams);
                    updatePara(
                      currentRef,
                      [pre, { ...sourceRef, start, end }, post].filter((x) => x)
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
      }
    }
  };
  for (const index of yearSortedIndices) processSection(index);

  const processPart = (part: Layers, sourceRef: Ref, isFull?: true) => {
    const source = sections[sourceRef.section]!.content[sourceRef.paragraph]!;
    if (source.chars.includes(part.chars)) {
      const { start, end, pre, post } = findQuoteIndices(
        source.cleaned,
        part.cleaned
      );
      if (
        isFull ||
        !(source.cleaned[start - 1] === "“" && source.cleaned[end] === "”")
      ) {
        return [pre, { ...sourceRef, start, end }, post].filter((p) => p);
      }
    }
  };

  const paraPartQuotes = (ref: { section: number; paragraph: number }) => {
    const section = sections[ref.section]!;
    const para = section.content[ref.paragraph]!;

    if (typeof para.para !== "string") return;

    // Some parts possible quoted from different sources
    let processedParts = para.parts.flatMap((part) => {
      const partSources = getPossibleSources(ref, part.ngrams);
      for (const sourceRef of partSources) {
        const processed = processPart(part, sourceRef);
        if (processed) {
          clearNgrams(ref, part.ngrams);
          // addLink(ref.section, sourceRef.section);
          return processed;
        }
      }
      return [part.text];
    });

    // Extending to neighbouring quoted parts
    const partInserts: Record<string, { pre: string; post: string }> = {};
    for (let i = processedParts.length - 1; i >= 0; i -= 1) {
      const base = processedParts[i]!;
      if (typeof base !== "string") {
        [-1, 1].forEach((dir) => {
          for (let j = i + dir; j >= 0; j += dir) {
            const current = processedParts[j];
            if (typeof current === "string") {
              const curr = getLayers(current);
              const source = sections[base.section]!.content[base.paragraph]!;
              if (
                !(current[0] === "”" && current[current.length - 1] === "“")
              ) {
                if (/[a-z0-9]/.test(curr.cleaned.replace(/\[[^\]]*\]/g, ""))) {
                  if (source.chars.includes(curr.chars)) {
                    clearNgrams(ref, curr.ngrams);
                    const { start, end, pre, post } = findQuoteIndices(
                      source.cleaned,
                      curr.cleaned
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

    const result = joinStringParts(processedParts);
    if (result.length === 1 && typeof result[0] === "string") return;
    return result;
  };

  for (const index of yearSortedIndices) {
    if (canBeAQuote(index)) {
      console.log(sections[index]!.path.map((p) => p[0]).join(", "));
      const section = sections[index]!;
      if (
        !(
          (["Bahá’u’lláh", "The Báb"].includes(section.path[0]![0]) &&
            section.path[1]![0] !==
              "Gleanings from the Writings of Bahá’u’lláh") ||
          section.prayer
        )
      ) {
        section.content.forEach((_, paraIndex) => {
          const ref = { section: index, paragraph: paraIndex };
          const processed = paraPartQuotes(ref);
          if (processed) updatePara(ref, processed);
        });
      }
    }
  }

  // Added quoted information
  const allQuoted = sections.flatMap((section, sIndex) =>
    section.content.flatMap((para, i) => {
      if (!Array.isArray(para.para)) return [];
      let index = 0;
      return para.para.flatMap((a) => {
        const text = typeof a === "string" ? a : getQuoteText(a);
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

  const getAllQuotes = (quote: RefQuote): RefQuote[] => {
    const offset = quote.start - quote.refStart;
    return [
      quote,
      ...(
        (sections[quote.section]!.quoted || {})[quote.paragraph] || []
      ).flatMap((q2) => {
        const overlap = getRangeIntersection(
          quote.refStart,
          quote.refEnd,
          q2.start,
          q2.end
        );
        if (!overlap) return [];
        return getAllQuotes({
          start: overlap.start + offset,
          end: overlap.end + offset,
          section: q2.section,
          paragraph: q2.paragraph,
          refStart: overlap.start,
          refEnd: overlap.end,
        });
      }),
    ];
  };

  const mappedQuoted = sections.map((d) =>
    Object.keys(d.quoted || {}).reduce((res, k) => {
      const allQuotes = d.quoted![k]!.flatMap((q) => getAllQuotes(q));
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
                textIsConnector(
                  d.content[parseInt(k, 10)]!.cleaned.slice(
                    last.end,
                    current.start
                  )
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

  await writeJSON(
    "",
    "data",
    sections.map((section) => ({
      ...section,
      content: section.content.map((para) => para.para),
    }))
  );
})();
