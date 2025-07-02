import baseData from "../data/data.json";

import type { Quote, Section, SectionContent } from "./structure";

export interface RenderQuote {
  path: [string, string][];
  author: string;
}

interface ParaText {
  type?: "break" | "info" | "call" | "framing";
  text: string;
  lines?: number[];
  quotes?: {
    start: number;
    end: number;
    quote: { section: number; paragraph: number };
  }[];
  quoted: {
    start: number;
    end: number;
    quote: { section: number; paragraph: number };
  }[];
  allSpecial: boolean;
}

export type RenderContent =
  | { type: "break" }
  | { text: string; quote?: true | RenderQuote; quoted: number }[]
  | {
      type: "normal" | "info" | "call" | "framing" | "lines";
      lines: { text: string; quoted: number }[][];
      allSpecial: boolean;
      quote?: RenderQuote;
    };

const data = baseData as Section[];
const dataWithIndices = data.map((section, index) => ({ section, index }));

const capitalise = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const collapseSingleKeys = (
  tree: any,
  maxDepth: number
): [[string, string][], any] => {
  const path: [string, string][] = [];
  let current = tree;
  while (path.length < maxDepth) {
    const keys = Object.keys(current);
    if (keys.length !== 1) break;
    const [title, url] = JSON.parse(keys[0]!);
    path.push([title, `${(path[path.length - 1] || [])[1] || ""}/${url}`]);
    current = current[keys[0]!];
  }
  return [path, current];
};

const getParagraphIds = (section: Section) => {
  let currentMain = 1;
  let currentSpecial = 0;
  const allIds = section.content.map((para) => {
    if (typeof para === "string" || !("type" in para)) {
      currentSpecial = 0;
      return `${currentMain++}`;
    }
    return `${currentMain}${["a", "b", "c", "d", "e", "f", "g", "h", "i"][currentSpecial++]}`;
  });
  return allIds;
};

const simplifyLinkLabels = {
  "Gleanings from the Writings of Bahá’u’lláh": "Gleanings",
  "Tablets of Bahá’u’lláh": "Tablets",
  "Selections from the Writings of ‘Abdu’l‑Bahá": "Selections",
  "Commissioned by the Universal House of Justice": "Publications",
} as Record<string, string>;

const getParasString = (paras: number[], paraIds: string[]) => {
  const result = [];
  let start = paras[0]!;
  let end = paras[0]!;
  for (let i = 1; i <= paras.length; i++) {
    const current = paras[i]!;
    if (current === end + 1) {
      end = current;
    } else if (current !== end) {
      if (start === end) result.push(`Para ${paraIds[start]}`);
      else result.push(`Paras ${paraIds[start]}-${paraIds[end]}`);
      start = end = current;
    }
  }
  return result.join(", ");
};

const getUrlQuote = (source: {
  section: number;
  paragraph: number | number[];
}): RenderQuote => {
  let current = "";
  const section = data[source.section]!;
  const res: [string, string][] = section.path.map((p) => {
    current = `${current}/${p[1]}`;
    return [
      simplifyLinkLabels[p[0]] || p[0].replace(/ \([^\)]*\)/, ""),
      current,
    ];
  });
  const paragraphs = Array.isArray(source.paragraph)
    ? source.paragraph
    : [source.paragraph];
  const paraIds = getParagraphIds(section);
  if (
    !Array.from({ length: paraIds.length }).every((_, i) =>
      paragraphs.includes(i)
    )
  ) {
    res.push([
      getParasString(paragraphs, paraIds),
      `${current}#${paraIds[Math.min(...paragraphs)]}`,
    ]);
  }

  if (res[1]![0] === "The Hidden Words") {
    res[2]![0] = res[2]![0].split(":")[0]!;
  } else if (res[1]![0] === "The Summons of the Lord of Hosts") {
    res.splice(1, 1);
  } else if (res[1]![0] === "The Promulgation of Universal Peace") {
    res[3]![0] = res[3]![0].split(":")[0]!;
    res.splice(2, 1);
  } else if (res[1]![0] === "Tablets of the Divine Plan") {
    res[2]![0] = res[2]![0].split(":")[0]!;
  } else if (res[1]![0] === "Some Answered Questions") {
    res[2]![0] = res[2]![0].split(":")[0]!;
  } else if (res[1]![0] === "The World Order of Bahá’u’lláh") {
    res.splice(1, 1);
  } else if (res[1]![0] === "God Passes By") {
    res[2]![0] = res[2]![0].split(":")[0]!;
  } else if (
    res[0]![0] === "The Universal House of Justice" &&
    res[1]![0] === "Selected Messages"
  ) {
    res[2]![0] = res[2]![0].split(",")[0]!;
    res.splice(1, 1);
  }

  for (const chunk of res.slice(1)) {
    if (chunk[0].startsWith("The ")) chunk[0] = capitalise(chunk[0].slice(4));
  }

  return {
    path: res,
    author: section.prayer || section.meta || section.path[0]![0],
  };
};

const getAllSpecial = (section: Section) =>
  section.content.every(
    (para) => !Array.isArray(para) && typeof para !== "string"
  );

const textIsConnector = (text: string) =>
  !/[a-z0-9]/.test(
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\[[^\]]*\]/g, "")
  );

const getText = (para: SectionContent): string => {
  if (typeof para === "string") return para;
  if (!Array.isArray(para)) {
    if ("type" in para && para.type === "break") return "";
    return para.text;
  }
  return para
    .map((part) => (typeof part === "string" ? part : getQuoteText(part)))
    .join("");
};
const getQuoteText = (quote: Quote) =>
  getText(data[quote.section]!.content[quote.paragraph]!).slice(
    quote.start,
    quote.end
  );

const getPara = (
  para: SectionContent,
  flatQuoted: {
    start: number;
    end: number;
    section: number;
    paragraph: number;
  }[] = [],
  allSpecial: boolean
): ParaText => {
  const quoted = flatQuoted.map(({ start, end, section, paragraph }) => ({
    start,
    end,
    quote: { section, paragraph },
  }));
  if (typeof para === "string") return { text: para, quoted, allSpecial };
  if (!Array.isArray(para)) return { text: "", ...para, quoted, allSpecial };
  const parts = para.map((part) => {
    if (typeof part === "string") return { text: part };
    return { text: getQuoteText(part), quote: part };
  });
  let current = 0;
  const res = {
    text: "",
    quotes: [] as {
      start: number;
      end: number;
      quote: { section: number; paragraph: number };
    }[],
    quoted,
    allSpecial,
  };
  for (const { text, quote } of parts) {
    res.text += text;
    if (quote) {
      res.quotes.push({
        start: current,
        end: current + text.length,
        quote: { section: quote.section, paragraph: quote.paragraph },
      });
    }
    current += text.length;
  }
  for (let i = 0; i < res.quotes.length; i++) {
    const current = res.quotes[i]!;
    const pre = res.text.slice(0, current.start).match(/“[^a-z0-9‘]*$/)?.[0];
    if (pre) current.start = current.start - pre.length;
    const post = res.text.slice(current.end).match(/^[^a-z0-9’]*”/)?.[0];
    if (post) current.end = current.end + post.length;
  }
  return res;
};

const slicePara = (
  para: ParaText,
  part: { start: number; end: number }
): ParaText => {
  const lines = para.lines
    ? para.lines.filter((x) => part.start < x && x < part.end)
    : [];
  const quotes = para.quotes
    ? para.quotes.filter((q) => q.start < part.end && part.start < q.end)
    : [];
  return {
    type: para.type,
    text: para.text.slice(part.start, part.end),
    lines:
      lines.length > 0
        ? [0, ...lines.map((x) => x - part.start), part.end]
        : undefined,
    quotes:
      quotes.length > 0
        ? quotes.map((q) => ({
            start: Math.max(q.start, part.start) - part.start,
            end: Math.min(q.end, part.end) - part.start,
            quote: q.quote,
          }))
        : undefined,
    quoted: para.quoted
      .filter((q) => q.start < part.end && part.start < q.end)
      .map((q) => ({
        start: Math.max(q.start, part.start) - part.start,
        end: Math.min(q.end, part.end) - part.start,
        quote: q.quote,
      })),
    allSpecial: para.allSpecial,
  };
};

const joinParaParts = (parts: (string | ParaText)[]): ParaText => {
  const paraParts = parts.filter((p) => typeof p !== "string");

  if (paraParts.length === 1 && paraParts[0]!.lines) {
    const result: ParaText = {
      text: "",
      lines: [],
      quoted: [],
      allSpecial: paraParts[0]!.allSpecial,
    };
    let current = 0;
    for (const part of parts) {
      if (typeof part === "string") {
        result.text += part;
        current += part.length;
      } else {
        result.text += part.text;
        result.lines = part.lines!.map((x) => x + current);
        result.quoted = part.quoted.map((q) => ({
          start: q.start + current,
          end: q.end + current,
          quote: q.quote,
        }));
        current += part.text.length;
      }
    }
    return result;
  }

  const types = [...new Set(paraParts.map((p) => p.type))];
  const allSpecials = [...new Set(paraParts.map((p) => p.allSpecial))];
  const result: ParaText = {
    type: types.length === 1 ? types[0] : undefined,
    text: "",
    quotes: [],
    quoted: [],
    allSpecial: allSpecials.length === 1 ? allSpecials[0]! : false,
  };
  let current = 0;
  for (const part of parts) {
    if (typeof part === "string") {
      result.text += part;
      current += part.length;
    } else {
      result.text += part.text;
      result.quotes!.push(
        ...(part.quotes || []).map((q) => ({
          start: q.start + current,
          end: q.end + current,
          quote: q.quote,
        }))
      );
      result.quoted.push(
        ...part.quoted.map((q) => ({
          start: q.start + current,
          end: q.end + current,
          quote: q.quote,
        }))
      );
      current += part.text.length;
    }
  }
  if (result.quotes!.length === 0) delete result.quotes;
  return result;
};

const getFullQuotedPara = (paraBase: SectionContent): ParaText => {
  if (typeof paraBase === "string") {
    return { text: paraBase, quoted: [], allSpecial: false };
  }
  const para = paraBase as (
    | string
    | { section: number; paragraph: number; start: number; end: number }
  )[];
  return joinParaParts(
    para.map((part) => {
      if (typeof part === "string") return part;
      const section = data[part.section]!;
      return slicePara(
        getPara(
          section.content[part.paragraph]!,
          section.quoted?.[part.paragraph],
          getAllSpecial(section)
        ),
        part
      );
    })
  );
};

const getIndices = (
  length: number,
  ...markers: { start: number; end: number }[][]
) =>
  [
    ...new Set([
      0,
      ...markers.flatMap((m) => m.flatMap(({ start, end }) => [start, end])),
      length,
    ]),
  ].sort((a, b) => a - b);

const filterQuoted = (para: ParaText, level: number): ParaText | null => {
  const indices = getIndices(para.text.length, para.quoted);
  const quotedParts = indices
    .slice(1)
    .map((end, i) => {
      const start = indices[i]!;
      return {
        start,
        end,
        quoted: para.quoted.filter((q) => q.start <= start && end <= q.end)
          .length,
      };
    })
    .filter((q) => q.quoted >= level);

  let current = 0;
  const nullParts: (null | ParaText)[] = [];
  for (const quote of quotedParts) {
    if (current < quote.start) nullParts.push(null);
    nullParts.push(slicePara(para, quote));
    current = quote.end;
  }
  if (current < para.text.length) nullParts.push(null);

  if (nullParts.every((p) => p === null)) return null;
  const parts = nullParts
    .flatMap((p, i) => {
      if (p !== null) return p;
      const prev = nullParts[i - 1]?.text || "";
      const next = nullParts[i + 1]?.text || "";
      if (prev.endsWith(". . .") || next.startsWith(". . .")) return [];
      if (i === 0) return ". . . ";
      if (i === nullParts.length - 1) return " . . .";
      return " . . . ";
    })
    .filter((p) => p);
  return joinParaParts(parts);
};

const capitaliseQuotes = (para: ParaText) => {
  para.text = para.text
    .replace(/^[a-z]/, (s) => s.toUpperCase())
    .replace(/([^ ][.?!] |^)“+[a-z]/g, (s) => s.toUpperCase());
};

const alternateQuoteMarks = (para: ParaText) => {
  let level = 1;
  let res = "";
  for (let i = 0; i < para.text.length; i++) {
    if (para.text[i] === "“") {
      level++;
      if (level % 2 === 0) res += "“";
      else res += "‘";
    } else if (para.text[i] === "”") {
      if (level % 2 === 0) res += "”";
      else res += "’";
      level--;
    } else {
      res += para.text[i];
    }
  }
  para.text = res;
};

const getRenderContent = (
  para: ParaText | null
): { content: RenderContent | null; quoted: RenderQuote[] } => {
  if (!para) return { content: null, quoted: [] };

  const quoted = [
    ...new Set(para.quoted.map((q) => JSON.stringify(q.quote))),
  ].map((q) => getUrlQuote(JSON.parse(q)));
  capitaliseQuotes(para);
  alternateQuoteMarks(para);

  if (para.type === "break") return { content: { type: "break" }, quoted };

  const quotedIndices = getIndices(para.text.length, para.quoted);

  const sources: { section: number; paragraph: number }[] = [
    ...new Set((para.quotes || []).map(({ quote }) => JSON.stringify(quote))),
  ].map((x) => JSON.parse(x));

  const quoteIndices = getIndices(para.text.length, para.quotes || []);
  const quoteParts: {
    text: string;
    quote?: { section: number; paragraph: number } | true;
  }[] = quoteIndices.slice(1).map((end, i) => {
    const start = quoteIndices[i]!;
    return {
      text: para.text.slice(start, end),
      quote: (para.quotes || []).find((q) => q.start <= start && end <= q.end)
        ?.quote,
    };
  });
  for (let i = 0; i < quoteParts.length; i++) {
    const current = quoteParts[i]!;
    const prev = quoteParts[i - 1]!;
    const next = quoteParts[i + 1]!;
    if (
      !current.quote &&
      textIsConnector(current.text) &&
      (!prev || prev.quote) &&
      (!next || next.quote)
    ) {
      current.quote = true;
    }
  }

  const singleQuote =
    sources.length === 1 && quoteParts.every((part) => part.quote);
  if (singleQuote || para.type) {
    return {
      content: {
        type: singleQuote ? "normal" : para.type!,
        lines: [
          quotedIndices.slice(1).map((end, i) => {
            const start = quotedIndices[i]!;
            return {
              text: para.text.slice(start, end),
              quoted: para.quoted.filter(
                (q) => q.start <= start && end <= q.end
              ).length,
            };
          }),
        ],
        allSpecial: para.allSpecial,
        quote: singleQuote ? getUrlQuote(sources[0]!) : undefined,
      },
      quoted,
    };
  }

  if (para.lines) {
    return {
      content: {
        type: "lines",
        lines: para.lines.slice(1).map((lineEnd, i) => {
          const lineStart = para.lines![i]!;
          const lineIndices = [
            lineStart,
            ...quotedIndices.filter((x) => lineStart < x && x < lineEnd),
            lineEnd,
          ];
          return lineIndices.slice(1).map((end, j) => {
            const start = lineIndices[j]!;
            return {
              text: para.text.slice(start, end),
              quoted: para.quoted.filter(
                (q) => q.start <= start && end <= q.end
              ).length,
            };
          });
        }),
        allSpecial: para.allSpecial,
      },
      quoted,
    };
  }

  let current = 0;
  const result = quoteParts.flatMap((part) => {
    const partIndices = [
      0,
      ...quotedIndices
        .map((x) => x - current)
        .filter((x) => x > 0 && x < part.text.length),
      part.text.length,
    ];
    const res = partIndices.slice(1).map((end, i) => {
      const start = partIndices[i]!;
      return {
        text: part.text.slice(start, end),
        quote:
          typeof part.quote === "object" ? getUrlQuote(part.quote) : part.quote,
        quoted: para.quoted.filter(
          (q) => current + start >= q.start && current + end <= q.end
        ).length,
      };
    });
    current += part.text.length;
    return res;
  });
  const resQuoteParts = result.filter((x) => typeof x.quote === "object");
  for (let i = 0; i < resQuoteParts.length; i++) {
    if (
      JSON.stringify(resQuoteParts[i]?.quote) ===
      JSON.stringify(resQuoteParts[i + 1]?.quote)
    ) {
      (resQuoteParts[i]!.quote as any) = true;
    }
  }
  return { content: result, quoted };
};

const getDisplaySources = (section: Section) => {
  if (
    !section.content.every(
      (para) =>
        (typeof para === "string" && textIsConnector(para)) ||
        (Array.isArray(para) &&
          para.every(
            (part) => typeof part !== "string" || textIsConnector(part)
          ))
    )
  ) {
    return null;
  }
  const paraSources: { section: number; paragraph: number }[][] =
    section.content.map((para) => {
      if (!Array.isArray(para)) return [];
      return [
        ...new Set(
          para
            .filter((part) => typeof part !== "string")
            .map(({ section, paragraph }) =>
              JSON.stringify({ section, paragraph })
            )
        ),
      ].map((x) => JSON.parse(x));
    });
  const displaySources: (null | {
    section: number;
    paragraph: number[];
  })[] = paraSources.map((s) =>
    s.length === 1
      ? { section: s[0]!.section, paragraph: [s[0]!.paragraph] }
      : null
  );
  for (let i = 0; i < displaySources.length - 1; i++) {
    const current = displaySources[i];
    const next = displaySources[i + 1];
    if (
      current &&
      next &&
      current.section === next.section &&
      data[current.section]!.path[1]![0] !== "The Hidden Words"
    ) {
      next.paragraph = [...current.paragraph, ...next.paragraph];
      displaySources[i] = null;
    }
  }
  return displaySources;
};

const joinParagraphBreaks = (paras: any[]) => {
  const res: any[] = [];
  for (const para of paras) {
    if (para.content.type === "break") {
      const last = res[res.length - 1];
      if (last && last?.content.type !== "break") res.push(para);
    } else {
      res.push(para);
    }
  }
  if (res[res.length - 1]?.content.type === "break") res.pop();
  return res;
};

const getData = (
  urlPath: string[],
  level: number,
  search: string
): {
  data: any[];
  path: [string, string][];
  tree: any;
  showContent: boolean;
} => {
  const showContent =
    data.find(
      (d) =>
        urlPath.length === d.path.length &&
        urlPath.every((p, i) => d.path[i]![1] === p)
    ) ||
    [
      "bahaullah/hidden-words",
      "bahaullah/gleanings-writings-bahaullah",
      "abdul-baha/selections-writings-abdul-baha",
    ].includes(urlPath.join("/")) ||
    (urlPath.length > 1 &&
      ["documents", "ruhi", "compilations"].includes(urlPath[0]!)) ||
    (urlPath.length > 2 && urlPath[1] === "bahaullah-new-era");

  const filtered = dataWithIndices.filter(({ section }) =>
    urlPath.every((p, i) => section.path[i]?.[1] === p)
  );

  const tree = {} as any;
  for (const { section } of filtered.filter(({ section }) => !section.meta)) {
    section.path.reduce((res, p) => {
      const key = JSON.stringify([p[0], p[1]]);
      return (res[key] = res[key] || {});
    }, tree);
  }
  const [path, nestedTree] = collapseSingleKeys(tree, urlPath.length);

  if (!showContent) {
    return {
      data: filtered.map(({ section }) => ({ ...section, content: [] })),
      path,
      tree: nestedTree,
      showContent: false,
    };
  }

  const result = filtered.map(({ section }) => {
    const paraIds = getParagraphIds(section);
    const displaySources = getDisplaySources(section);
    const allSpecial = getAllSpecial(section);
    return {
      ...section,
      content: joinParagraphBreaks(
        section.content
          .map((para, paraIndex) => ({
            paraId: paraIds[paraIndex]!,
            ...getRenderContent(
              filterQuoted(
                displaySources
                  ? getFullQuotedPara(para)
                  : getPara(para, section.quoted?.[paraIndex], allSpecial),
                level
              )
            ),
            source: displaySources?.[paraIndex]
              ? getUrlQuote(displaySources[paraIndex]!)
              : undefined,
          }))
          .filter((para) => para.content !== null)
      ),
    };
  });

  return {
    data: result.filter((x) => x.content.length > 0),
    path,
    tree: nestedTree,
    showContent: true,
  };
};

Bun.serve({
  port: 8000,
  routes: {
    "/api/:query": (req) => {
      const { path, level, search } = JSON.parse(req.params.query);
      const data = getData(path, level, search);
      const res = Response.json(data);
      res.headers.set("Access-Control-Allow-Origin", "*");
      res.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      return res;
    },
  },
});

// interface Match {
//   section: number;
//   paragraph: number;
//   score: number;
//   level: number;
// }

// const escapeForRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// const searchInfo: Record<string, Match[]> = {};
// const getSearchInfo = (tokens: string[]) =>
//   tokens.flatMap((token) => {
//     if (!token) return [];
//     if (searchInfo[token]) return searchInfo[token];
//     const searchLine = baseSearch.match(
//       new RegExp(`^${escapeForRegex(token)}=.*`, "m")
//     );
//     if (searchLine) {
//       const [_, info, count] = searchLine[0].split("=");
//       const matches = info!.split(",").map((p) => {
//         const [p2, level] = p.split("|");
//         const [key, score] = p2!.split("_");
//         const [sectionIndex, paraIndex] = key!.split(":");
//         return {
//           section: parseInt(sectionIndex!, 10),
//           paragraph: parseInt(paraIndex!, 10),
//           score: score === undefined ? 2 : parseInt(score, 10),
//           level: level === undefined ? 0 : parseInt(level, 10),
//         };
//       });
//       searchInfo[token] = matches;
//     } else {
//       searchInfo[token] = [];
//     }
//     return searchInfo[token];
//   });

// const getData = (
//   search: string,
//   ...urlPath: string[]
// ): { data: RenderSection[]; path: [string, string][]; tree: any } => {
//   const showContent =
//     data.find(
//       (d) =>
//         urlPath.length === d.path.length &&
//         urlPath.every((p, i) => d.path[i]![1] === p)
//     ) ||
//     [
//       "bahaullah/hidden-words",
//       "bahaullah/gleanings-writings-bahaullah",
//     ].includes(urlPath.join("/")) ||
//     (urlPath.length > 1 &&
//       ["documents", "ruhi", "compilations"].includes(urlPath[0]!)) ||
//     (urlPath.length > 2 && urlPath[1] === "bahaullah-new-era");

//   const tokens = search
//     .split(/( |—)/)
//     .map((word) =>
//       stem(
//         word
//           .normalize("NFD")
//           .replace(/[\u0300-\u036f]/g, "")
//           .toLowerCase()
//           .replace(/’s$/g, "")
//           .replace(/[^a-z0-9]/g, "")
//       )
//     )
//     .filter((t) => t);
//   const searchInfo = getSearchInfo(tokens);

//   const filtered = dataWithIndices.filter(
//     ({ section, index }) =>
//       !section.meta &&
//       urlPath.every((p, i) => section.path[i]?.[1] === p) &&
//       (tokens.length === 0 || searchInfo.some((m) => m.section === index))
//   );

//   const tree = {} as any;
//   for (const { section } of filtered) {
//     section.path.reduce((res, p) => {
//       const key = JSON.stringify([p[0], p[1]]);
//       return (res[key] = res[key] || {});
//     }, tree);
//   }
//   const [path, nestedTree] = collapseSingleKeys(tree, urlPath.length);

//   if (!showContent) {
//     return { data: [], path, tree: nestedTree };
//   }

//   const result = filtered.map(({ section, index }) => {
//     const content = semiToRender(
//       section,
//       section.content.map(
//         (c, paraIndex): SemiRenderContent =>
//           contentToSemi(c, (section.quoted || {})[paraIndex] || [])
//       )
//     )
//       .map((para, paraIndex) => {
//         if (para.type === "break") return para;
//         const match = searchInfo.find(
//           (s) => s.section === index && s.paragraph === paraIndex
//         );
//         if (!match) return para;
//         const lines = para.parts.map((line) => {
//           const res = [];
//           for (const part of line) {
//             if (part.quoted >= match.level) {
//               res.push(part);
//             } else if (res[res.length - 1] !== null) {
//               res.push(null);
//             }
//           }
//           if (res.length === 1 && res[0] === null) return [];
//           return res;
//         });
//         let started = false;
//         lines.forEach((line, i) => {
//           if (line.length === 0) {
//             if (started) {
//               if (
//                 lines[i - 1]!.length > 0 &&
//                 lines[i - 1]![lines[i - 1]!.length - 1] !== null
//               ) {
//                 lines[i - 1]!.push(null);
//               }
//             } else {
//               if (lines[i + 1]!.length > 0 && lines[i + 1]![0] !== null) {
//                 lines[i + 1]!.unshift(null);
//               }
//             }
//           } else {
//             started = true;
//           }
//         });
//         return {
//           ...para,
//           parts: lines
//             .map((line) =>
//               line.map((part, i) => {
//                 if (part !== null) return part;
//                 return {
//                   text:
//                     i === 0
//                       ? ". . . "
//                       : i === line.length - 1
//                         ? " . . ."
//                         : " . . . ",
//                   quoted: 0,
//                 };
//               })
//             )
//             .filter((line) => line.length > 0),
//         };
//       })
//       .filter(
//         (_, paraIndex) =>
//           tokens.length === 0 ||
//           searchInfo.some(
//             (m) => m.section === index && m.paragraph === paraIndex
//           )
//       )
//       .map((para) => {
//         if (para.type === "break") return para;
//         return {
//           ...para,
//           parts: para.parts.map((line) =>
//             line.flatMap((part) => {
//               const words = part.text.split(/( |—)/);
//               const res = [{ ...part, text: "" }];
//               for (const word of words) {
//                 const tidied = word
//                   .normalize("NFD")
//                   .replace(/[\u0300-\u036f]/g, "")
//                   .toLowerCase()
//                   .replace(/’s$/g, "")
//                   .replace(/[^a-z0-9]/g, "");
//                 const token = stem(tidied);
//                 if (token && tokens.includes(token)) {
//                   res.push(
//                     { ...part, text: word, highlight: true },
//                     { ...part, text: "" }
//                   );
//                 } else {
//                   res[res.length - 1]!.text += word;
//                 }
//               }
//               return res.filter((r) => r.text);
//             })
//           ),
//         };
//       });
//     return {
//       ...section,
//       content: content,
//     };
//   });
//   return {
//     data: result,
//     path,
//     tree: nestedTree,
//   };
// };
