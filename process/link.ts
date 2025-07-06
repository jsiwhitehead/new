import sources from "./sources";
import { readJSON, writeJSON } from "../utils/files";
import type {
  Quote,
  Range,
  Ref,
  Section,
  SectionContent,
} from "../utils/types";
import {
  compareArrays,
  doRangesIntersect,
  getQuoteText,
  getRangesIntersect,
  getText,
  moveRange,
  refsEqual,
  toCleaned,
  textIsConnector,
  uniqueRefs,
} from "../utils/utils";

interface Layers {
  text: string;
  cleaned: string;
  words: string;
  chars: string;
  ngrams: string[];
}

const data: Section[] = [];
for (const author of Object.keys(sources)) {
  await Promise.all(
    Object.keys(sources[author]!).map(async (file) => {
      const id = `${author}-${file}`;
      const structure = await readJSON("structure", id);
      if (structure) data.push(...structure);
    })
  );
}
for (const id of ["additional", "prayers", "shoghi-effendi-messages"]) {
  data.push(...(await readJSON("structure", id)));
}
data.sort((a, b) =>
  compareArrays(
    a.path.map((p: [string, string, number]) => p[2]),
    b.path.map((p: [string, string, number]) => p[2])
  )
);

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

const layers = data.map(({ content }, section) =>
  content.map((_, paragraph) =>
    getLayers(getText(data, { section, paragraph }))
  )
);

const updatePara = (ref: Ref, para: SectionContent) => {
  data[ref.section]!.content[ref.paragraph]! = para;
  layers[ref.section]![ref.paragraph]! = getLayers(getText(data, ref));
};

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

const canBeAQuote = (section: number) => {
  const { path, prayer, meta } = data[section]!;
  return !(
    (["Bahá’u’lláh", "The Báb", "‘Abdu’l‑Bahá"].includes(path[0]![0]) &&
      ![
        "Gleanings from the Writings of Bahá’u’lláh",
        "Selections from the Writings of ‘Abdu’l‑Bahá",
      ].includes(path[1]![0]) &&
      !meta) ||
    prayer
  );
};

const canBeQuoted = (section: number) => {
  const { path } = data[section]!;
  return (
    path[0]![0] !== "Compilations" &&
    !(
      path[0]![0] === "Ruhi Institute" &&
      path[2]?.[0] !== "A Few Thoughts for the Tutor"
    ) &&
    path[2]?.[0] !== "A Description of the Kitáb‑i‑Aqdas by Shoghi Effendi"
  );
};

const yearSortedIndices = data
  .map((section, index) => ({ section, index }))
  .sort((a, b) => a.section.years[0] - b.section.years[0] || a.index - b.index)
  .map(({ index }) => index);

const ngramMap = new Map<string, { ref: Ref; years: [number, number] }[]>();
yearSortedIndices.forEach((section) => {
  const { content, years } = data[section]!;
  if (canBeQuoted(section)) {
    content.forEach((_, paragraph) => {
      for (const ng of layers[section]![paragraph]!.ngrams) {
        ngramMap.set(ng, [
          ...(ngramMap.get(ng) || []),
          { ref: { section, paragraph }, years },
        ]);
      }
    });
  }
});
const clearNgrams = (ref: Ref, ngrams: string[]) => {
  for (const ng of ngrams) {
    if (ngramMap.has(ng)) {
      const filtered = ngramMap.get(ng)!.filter((x) => !refsEqual(x.ref, ref));
      ngramMap.set(ng, filtered);
    }
  }
};

const getPossibleSources = (ref: Ref, ngrams: string[]) => {
  const refYears = data[ref.section]!.years;
  const filtered = ngrams
    .flatMap((ng) =>
      (ngramMap.get(ng) || []).filter(
        (x) => x.ref.section !== ref.section && x.years[0] <= refYears[1]
      )
    )
    .sort(
      (a, b) =>
        a.years[0] - b.years[0] ||
        a.ref.section - b.ref.section ||
        a.ref.paragraph - b.ref.paragraph
    );
  return uniqueRefs(filtered.map((x) => x.ref));
};

const processPart = (part: Layers, sourceRef: Ref, canQuoteQuote: boolean) => {
  const source = layers[sourceRef.section]![sourceRef.paragraph]!;
  if (source.chars.includes(part.chars)) {
    processSection(sourceRef.section);
    if (processedMap.get(sourceRef.section) === "complete") {
      if (
        part.ngrams.some((ng) =>
          ngramMap.get(ng)?.some((x) => refsEqual(x.ref, sourceRef))
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
              const source = layers[base.section]![base.paragraph]!;
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

const processPara = (ref: Ref) => {
  if (typeof data[ref.section]!.content[ref.paragraph]! !== "string") return;

  const para = layers[ref.section]![ref.paragraph]!;

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
      return processedParts;
    }
  }

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
const processSection = (section: number) => {
  if (!processedMap.has(section)) {
    processedMap.set(section, "started");
    const { path, content } = data[section]!;

    if (canBeAQuote(section)) {
      console.log(path.map((p) => p[0]).join(", "));

      // Whole paragraphs are a quote
      content.forEach((_, paragraph) => {
        const ref = { section, paragraph };
        const processed = processPara(ref);
        if (processed) updatePara(ref, processed);
      });

      // Extending to neighbouring quoted paragraphs
      for (let i = 0; i < content.length; i++) {
        const base = content[i]!;
        if (
          Array.isArray(base) &&
          base.filter((x) => typeof x !== "string").length === 1
        ) {
          const baseSource = base.find((x) => typeof x !== "string")!;
          for (const dir of [-1, 1]) {
            for (let j = i + dir; j >= 0 && j < content.length; j += dir) {
              const current = layers[section]![j]!;
              if (current.chars.length > 0) {
                const sourceRef = {
                  section: baseSource.section,
                  paragraph: baseSource.paragraph + (j - i),
                };
                const source = layers[sourceRef.section]![sourceRef.paragraph]!;
                if (source?.chars.includes(current.chars)) {
                  const { start, end, pre, post } = findQuoteIndices(
                    source.cleaned,
                    current.cleaned
                  );
                  const currentRef = { section, paragraph: j };
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
    processedMap.set(section, "complete");
  }
};
for (const index of yearSortedIndices) processSection(index);

// Added quoted information

type RefQuote = { range: Range; quote: Quote };

const allQuoting: { source: Quote; quote: Quote }[] = data.flatMap(
  (section, sIndex) =>
    section.content.flatMap((para, i) => {
      if (!Array.isArray(para)) return [];
      let index = 0;
      return para.flatMap((part) => {
        const text = typeof part === "string" ? part : getQuoteText(data, part);
        const start = index;
        index += text.length;
        if (typeof part === "string") return [];
        return [
          {
            source: part,
            quote: { section: sIndex, paragraph: i, start, end: index },
          },
        ];
      });
    })
);

const baseQuoted: RefQuote[][][] = data.map(({ content }, section) => {
  const sectionQuoted = allQuoting.filter((a) => a.source.section === section);
  return content.map((_, paragraph) => {
    const paraQuoted = sectionQuoted.filter(
      (a) => a.source.paragraph === paragraph
    );
    return uniqueRefs(paraQuoted.map((q) => q.quote)).flatMap((quote) => {
      const quotedBy = paraQuoted.filter((q) => refsEqual(q.quote, quote));
      quotedBy.sort((a, b) => a.source.start - b.source.start);
      return quotedBy.map((q) => ({
        range: { start: q.source.start, end: q.source.end },
        quote: q.quote,
      }));
    });
  });
});

const getAllQuotes = (base: RefQuote): RefQuote[] => {
  const { range, quote } = base;
  const offset = range.start - quote.start;
  return [
    base,
    ...baseQuoted[quote.section]![quote.paragraph]!.flatMap((q2) => {
      const overlap = getRangesIntersect(quote, q2.range);
      if (!overlap) return [];
      return getAllQuotes({
        range: moveRange(overlap, offset),
        quote: { ...q2.quote, ...overlap },
      });
    }),
  ];
};

const mappedQuoted = baseQuoted.map((contentQuotes, section) =>
  contentQuotes.map((paraQuotes, paragraph) => {
    const allQuotes = paraQuotes.flatMap((q) => getAllQuotes(q));
    const allRefs = uniqueRefs(allQuotes.map((q) => q.quote));
    return allRefs
      .flatMap((quote) => {
        const refQuotes = allQuotes.filter((q) => refsEqual(q.quote, quote));
        refQuotes.sort((a, b) => a.range.start - b.range.start);
        const cleaned = layers[section]![paragraph]!.cleaned;
        const merged = [refQuotes[0]!];
        for (let i = 1; i < refQuotes.length; i++) {
          const last = merged[merged.length - 1]!;
          const current = refQuotes[i]!;
          if (
            current.range.start < last.range.end ||
            textIsConnector(cleaned.slice(last.range.end, current.range.start))
          ) {
            last.range.end = Math.max(last.range.end, current.range.end);
          } else {
            merged.push(current);
          }
        }
        return merged;
      })
      .map((x) => ({ ...x.quote, ...x.range }))
      .sort((a, b) => {
        const aDoc = data[a.section]!;
        const bDoc = data[b.section]!;
        return compareArrays(
          aDoc.path.map((p: [string, string, number]) => p[2]),
          bDoc.path.map((p: [string, string, number]) => p[2])
        );
      });
  })
);

data.forEach(({ content }, section) => {
  content.forEach((para, paragraph) => {
    if (
      Array.isArray(para) &&
      para.every((part) => typeof part !== "string" || textIsConnector(part))
    ) {
      const res = para.map((part) => {
        if (typeof part === "string") return { text: part };
        return { text: getQuoteText(data, part), quote: part };
      });
      let current = 0;
      const quoted: Quote[] = [];
      for (const part of res) {
        if (part.quote) {
          quoted.push(
            ...mappedQuoted[part.quote.section]![part.quote.paragraph]!.filter(
              (q) => doRangesIntersect(q, part.quote)
            ).map((q) => ({
              ...q,
              ...moveRange(
                getRangesIntersect(q, part.quote)!,
                -part.quote.start + current
              ),
            }))
          );
        }
        current += part.text.length;
      }
      mappedQuoted[section]![paragraph]! = quoted;
    }
  });
});

data.forEach((d, section) => {
  if (mappedQuoted[section]!.some((q) => q.length > 0)) {
    const content = d.content;
    delete (d as any).content;
    d.quoted = mappedQuoted[section]!.reduce(
      (res, quoted, i) => (quoted.length > 0 ? { ...res, [i]: quoted } : res),
      {}
    );
    d.content = content;
  }
});

await writeJSON("", "data", data);
