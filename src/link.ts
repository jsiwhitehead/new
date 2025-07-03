import sources from "./sources";
import type { Quote, RefQuote, Section, SectionContent } from "./structure";
import { comparePathNums, readJSON, writeJSON } from "./utils";

export interface Ref {
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

const shortPassages = ["whatever decreaseth fear increaseth courage"];
const getNGrams = (words: string, n = 7) => {
  const splitWords = words.split(" ");
  const ngrams: string[] = [];
  for (let i = 0; i <= splitWords.length - n; i++) {
    ngrams.push(splitWords.slice(i, i + n).join(" "));
  }
  for (const short of shortPassages) {
    if (words.includes(short)) ngrams.push(short);
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
  let level = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (char === "”") {
      level--;
      if (level === 0) result.push("");
    }
    result[result.length - 1] += char;
    if (char === "“") {
      if (level === 0) result.push("");
      level++;
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
    content: section.content.map((para) => ({ para, ...getLayers("") })),
  }));

  const canBeAQuote = (sectionIndex: number) => {
    const section = sections[sectionIndex]!;
    return !(
      (["Bahá’u’lláh", "The Báb", "‘Abdu’l‑Bahá"].includes(
        section.path[0]![0]
      ) &&
        ![
          "Gleanings from the Writings of Bahá’u’lláh",
          "Selections from the Writings of ‘Abdu’l‑Bahá",
        ].includes(section.path[1]![0]) &&
        !section.meta) ||
      section.prayer
    );
  };

  const canBeQuoted = (sectionIndex: number) => {
    const section = sections[sectionIndex]!;
    return (
      section.path[0]![0] !== "Compilations" &&
      !(
        section.path[0]![0] === "Ruhi Institute" &&
        section.path[2]?.[0] !== "A Few Thoughts for the Tutor"
      ) &&
      section.path[2]?.[0] !==
        "A Description of the Kitáb‑i‑Aqdas by Shoghi Effendi"
    );
  };

  const updatePara = (
    ref: { section: number; paragraph: number },
    para: SectionContent
  ) => {
    const base = sections[ref.section]!.content[ref.paragraph]!;
    base.para = para;
    Object.assign(base, getLayers(getText(ref)));
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
    if (canBeQuoted(index)) {
      section.content.forEach((para, i) => {
        for (const ng of para.ngrams) {
          ngramMap.set(ng, [
            ...(ngramMap.get(ng) || []),
            { section: index, paragraph: i, years: section.years },
          ]);
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

  const processPart = (
    part: Layers,
    sourceRef: Ref,
    canQuoteQuote: boolean
  ) => {
    const source = sections[sourceRef.section]!.content[sourceRef.paragraph]!;
    if (source.chars.includes(part.chars)) {
      processSection(sourceRef.section);
      if (processedMap.get(sourceRef.section) === "complete") {
        if (
          part.ngrams.some((ng) =>
            ngramMap.get(ng)?.some((x) => refsEqual(x, sourceRef))
          )
        ) {
          const { start, end, pre, post } = findQuoteIndices(
            source.cleaned,
            part.cleaned
          );
          if (
            canQuoteQuote ||
            !(
              /“[^a-z0-9‘]*$/.test(source.cleaned.slice(0, start)) &&
              /^[^a-z0-9’]*”/.test(source.cleaned.slice(end))
            )
          ) {
            return [pre, { ...sourceRef, start, end }, post].filter((p) => p);
          }
        }
      }
    }
  };

  const checkSmallPart = (base: Quote, source: Layers, current: Layers) => {
    if (source.cleaned.includes(current.cleaned)) {
      const start = source.cleaned.indexOf(current.cleaned);
      const end = start + current.cleaned.length;
      if (end <= base.start || base.end <= start) {
        return {
          quote: { ...base, start, end: start + current.cleaned.length },
        };
      }
    }
    const cleaned = current.cleaned.endsWith(",")
      ? current.cleaned.slice(0, -1)
      : current.cleaned;
    if (source.cleaned.includes(cleaned)) {
      const start = source.cleaned.indexOf(cleaned);
      const end = start + cleaned.length;
      if (end <= base.start || base.end <= start) {
        return {
          quote: { ...base, start, end: start + cleaned.length },
          post: ",",
        };
      }
    }
  };

  const extendQuoteParts = (
    ref: Ref,
    parts: (string | Quote)[],
    inline: boolean
  ) => {
    const inserts: Record<string, { pre: string; post: string }> = {};
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const base = parts[i]!;
      if (typeof base !== "string") {
        [-1, 1].forEach((dir) => {
          for (let j = i + dir; j >= 0; j += dir) {
            const current = parts[j];
            if (typeof current === "string") {
              if (
                !inline ||
                !(current.startsWith("”") || current.endsWith("“"))
              ) {
                const curr = getLayers(current);
                const source = sections[base.section]!.content[base.paragraph]!;
                if (!textIsConnector(curr.cleaned)) {
                  if (curr.cleaned.split(/ /g).length < 5) {
                    const res = checkSmallPart(base, source, curr);
                    if (res) {
                      clearNgrams(ref, curr.ngrams);
                      if (res.post) inserts[j] = { pre: "", post: res.post };
                      parts[j] = res.quote;
                    }
                  } else {
                    if (source.chars.includes(curr.chars)) {
                      clearNgrams(ref, curr.ngrams);
                      const { start, end, pre, post } = findQuoteIndices(
                        source.cleaned,
                        curr.cleaned
                      );
                      inserts[j] = { pre, post };
                      parts[j] = { ...base, start, end };
                    }
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
    return joinStringParts(
      parts.flatMap((x, i) =>
        inserts[i] ? [inserts[i].pre, x, inserts[i].post].filter((y) => y) : [x]
      )
    );
  };

  const processPara = (ref: { section: number; paragraph: number }) => {
    const para = sections[ref.section]!.content[ref.paragraph]!;
    if (typeof para.para !== "string") return;

    const parts = para.text
      .split(/( ?\. \. \. ?| ?\[[^\]]*\] ?)/)
      .filter((p) => p)
      .map((text) => getLayers(text));

    // All paragraph parts quoted from one source
    for (const sourceRef of getPossibleSources(ref, para.ngrams)) {
      const processedParts = extendQuoteParts(
        ref,
        parts.flatMap(
          (part) => processPart(part, sourceRef, true) || [part.text]
        ),
        false
      );
      if (
        processedParts.every(
          (p) => typeof p !== "string" || textIsConnector(toCleaned(p))
        )
      ) {
        clearNgrams(ref, para.ngrams);
        // addLink(ref.section, sourceRef.section);
        return processedParts;
      }
    }

    // // All paragraph parts quoted from one source that is partially a quote
    // for (const sourceRef of getPossibleSources(ref, para.ngrams, true)) {
    //   if (processedMap.get(sourceRef.section) === "complete") {
    //     const processedParts = extendQuoteParts(
    //       ref,
    //       parts.flatMap((part) => {
    //         if (textIsConnector(toCleaned(part.text))) return [para.text];
    //         const source =
    //           sections[sourceRef.section]!.content[sourceRef.paragraph]!;
    //         if (source.chars.includes(part.chars)) {
    //           const { start, end, pre, post } = findQuoteIndices(
    //             source.cleaned,
    //             part.cleaned
    //           );
    //           return [pre, { ...sourceRef, start, end }, post].filter((p) => p);
    //         }
    //         return [part.text];
    //       }),
    //       false
    //     );

    //     if (
    //       processedParts.every(
    //         (p) => typeof p !== "string" || textIsConnector(toCleaned(p))
    //       )
    //     ) {
    //       clearNgrams(ref, para.ngrams);
    //       addLink(ref.section, sourceRef.section);
    //       return processedParts;
    //     }
    //   }
    // }

    // // Whole paragraph quoted from one source that is partially a quote
    // if (!/\[[^\]]*\]/.test(para.text) && !/\. \. \./.test(para.text)) {
    //   const allSourcesFull = getPossibleSources(ref, para.ngrams);
    //   for (const sourceRef of allSourcesFull) {
    //     if (checkCanLink(ref.section, sourceRef.section)) {
    //       const source =
    //         sections[sourceRef.section]!.content[sourceRef.paragraph]!;
    //       if (source.chars.includes(para.chars)) {
    //         const { start, end, pre, post } = findQuoteIndices(
    //           source.cleaned,
    //           para.cleaned
    //         );
    //         clearNgrams(ref, para.ngrams);
    //         addLink(ref.section, sourceRef.section);
    //         return [pre, { ...sourceRef, start, end }, post].filter((p) => p);
    //       }
    //     }
    //   }
    // }

    // All paragraph parts quoted from multiple sources
    const processedParts = extendQuoteParts(
      ref,
      parts.flatMap((part) => {
        for (const sourceRef of getPossibleSources(ref, part.ngrams)) {
          const processed = processPart(part, sourceRef, true);
          if (processed) return processed;
        }
        return [part.text];
      }),
      false
    );
    if (
      processedParts.every(
        (p) => typeof p !== "string" || textIsConnector(toCleaned(p))
      )
    ) {
      clearNgrams(ref, para.ngrams);
      // for (const part of processedParts) {
      //   if (typeof part !== "string") addLink(ref.section, part.section);
      // }
      return processedParts;
    }

    // Inline quotes
    const chunks = splitQuoted(para.text);
    const result = extendQuoteParts(
      ref,
      chunks.flatMap((chunk, i) => {
        if (i % 2 === 0) return [chunk];
        const parts = chunk
          .split(/( ?\. \. \. ?| ?\[[^\]]*\] ?)/)
          .filter((p) => p)
          .map((text) => getLayers(text));
        return parts.flatMap((part) => {
          const partSources = getPossibleSources(ref, part.ngrams);
          for (const sourceRef of partSources) {
            const processed = processPart(part, sourceRef, false);
            if (processed) {
              clearNgrams(ref, part.ngrams);
              return processed;
            }
          }
          return [part.text];
        });
      }),
      true
    );
    if (result.length === 1 && typeof result[0] === "string") return;
    return result;
  };

  const processedMap = new Map<number, "started" | "complete">();
  const processSection = (sectionIndex: number) => {
    if (!processedMap.has(sectionIndex)) {
      processedMap.set(sectionIndex, "started");
      const section = sections[sectionIndex]!;

      if (canBeAQuote(sectionIndex)) {
        console.log(section.path.map((p) => p[0]).join(", "));

        // Whole paragraphs are a quote
        section.content.forEach((_, paraIndex) => {
          const ref = { section: sectionIndex, paragraph: paraIndex };
          const processed = processPara(ref);
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
      processedMap.set(sectionIndex, "complete");
    }
  };
  for (const index of yearSortedIndices) processSection(index);

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
            const cleaned = d.content[parseInt(k, 10)]!.cleaned;
            const merged = [refQuotes[0]!];
            for (let j = 1; j < refQuotes.length; j++) {
              const last = merged[merged.length - 1]!;
              const current = refQuotes[j]!;
              if (
                current.start <= last.end ||
                textIsConnector(cleaned.slice(last.end, current.start))
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
