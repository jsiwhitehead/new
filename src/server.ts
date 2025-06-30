import baseData from "../data/data.json";

const data = baseData as Section[];
const dataWithIndices = data.map((section, index) => ({ section, index }));

import type { Section, SectionContent } from "./structure";

export interface Quote {
  path: [string, string][];
  author: string;
}

type SemiRenderContent =
  | { type: "break" }
  | { text: string; quote?: true | Quote }[]
  | {
      type: "normal" | "info" | "call" | "framing" | "lines";
      lines: string[];
      allSpecial: boolean;
      quote?: Quote;
    };

export type RenderContent =
  | { type: "break" }
  | { text: string; quote?: true | Quote; quoted: number }[]
  | {
      type: "normal" | "info" | "call" | "framing" | "lines";
      lines: { text: string; quoted: number }[][];
      allSpecial: boolean;
      quote?: Quote;
    };

const sliceLines = (lines: string[], start: number, end: number) => {
  const res = [];
  let currentIndex = 0;
  for (const part of lines) {
    const partStart = currentIndex;
    const partEnd = currentIndex + part.length;
    const overlapStart = Math.max(start, partStart);
    const overlapEnd = Math.min(end, partEnd);
    if (overlapStart < overlapEnd) {
      res.push(part.slice(overlapStart - partStart, overlapEnd - partStart));
    }
    currentIndex += part.length + 1;
  }
  return res;
};

const sliceArray = (
  parts: { text: string; quote?: true | Quote }[],
  start: number,
  end: number
) => {
  const res = [];
  let currentIndex = 0;
  for (const part of parts) {
    const partStart = currentIndex;
    const partEnd = currentIndex + part.text.length;
    const overlapStart = Math.max(start, partStart);
    const overlapEnd = Math.min(end, partEnd);
    if (overlapStart < overlapEnd) {
      res.push({
        text: part.text.slice(overlapStart - partStart, overlapEnd - partStart),
        quote: part.quote,
      });
    }
    currentIndex += part.text.length;
  }
  return res;
};

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
const getQuoteText = (quote: {
  section: number;
  paragraph: number;
  start: number;
  end: number;
}) =>
  getText(data[quote.section]!.content[quote.paragraph]!).slice(
    quote.start,
    quote.end
  );

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
}): Quote => {
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

const expandQuotes = (parts: { text: string; quote?: true | Quote }[]) => {
  for (let i = 0; i < parts.length; i++) {
    const current = parts[i]!;
    const prev = parts[i - 1];
    const next = parts[i + 1];
    if (
      !current.quote &&
      textIsConnector(current.text) &&
      prev?.quote &&
      next?.quote
    ) {
      current.quote = true;
    }
    if (current.quote && prev && !prev.quote) {
      const pre = prev.text.match(/“[^a-z0-9‘]*$|‘[^a-z0-9“]*$/)?.[0];
      if (pre) {
        current.text = `${pre}${current.text}`;
        prev.text = prev.text.slice(0, prev.text.length - pre.length);
      }
    }
    if (current.quote && next && !next.quote) {
      const post = next.text.match(/^[^a-z0-9’]*”|^[^a-z0-9”]*’/)?.[0];
      if (post) {
        current.text = `${current.text}${post}`;
        next.text = next.text.slice(post.length);
      }
    }
  }
  return parts.filter((part) => part.text);
};

const capitalise = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
const capitaliseLines = (parts: string[]) => {
  for (let i = 0; i < parts.length; i++) {
    const pre = parts[i - 1]
      ?.replace(/\[([^\]]*)\]/g, (_, a) => a)
      .replace(/[“”‘’ ]/g, "");
    if (
      !pre ||
      ([".", "!", "?"].includes(pre[pre.length - 1]!) && !pre.endsWith(". . ."))
    ) {
      parts[i] = capitalise(parts[i]!);
    }
  }
  return parts;
};
const capitaliseQuotes = (parts: { text: string; quote?: true | Quote }[]) => {
  for (let i = 0; i < parts.length; i++) {
    const pre = parts[i - 1]?.text
      .replace(/\[([^\]]*)\]/g, (_, a) => a)
      .replace(/[“”‘’ ]/g, "");
    if (
      !pre ||
      ([".", "!", "?"].includes(pre[pre.length - 1]!) && !pre.endsWith(". . ."))
    ) {
      parts[i]!.text = capitalise(parts[i]!.text);
    }
  }
  return parts;
};

const getAllSpecial = (section: Section) =>
  section.content.every(
    (para) => !Array.isArray(para) && typeof para !== "string"
  );

const getSourceParts = (
  source: { section: number; paragraph: number },
  parts: (string | { start: number; end: number })[]
): SemiRenderContent => {
  const res = getPara(
    data[source.section]!.content[source.paragraph]!,
    getAllSpecial(data[source.section]!)
  );
  if ("type" in res && res.type === "break") {
    return res;
  }
  if (Array.isArray(res)) {
    return capitaliseQuotes(
      parts.flatMap((part) =>
        typeof part === "string"
          ? [{ text: part }]
          : sliceArray(res, part.start, part.end)
      )
    );
  }
  if (parts.filter((part) => typeof part !== "string").length === 1) {
    let extra = "";
    let lines: string[] = [];
    for (const part of parts) {
      if (typeof part === "string") {
        extra += part;
      } else {
        lines = sliceLines(res.lines, part.start, part.end);
        lines[0] = `${extra}${lines[0]}`;
        extra = "";
      }
    }
    lines[lines.length - 1] += extra;
    return {
      type: res.type === "lines" && lines.length === 1 ? "normal" : res.type,
      lines: capitaliseLines(lines),
      allSpecial: res.allSpecial,
      quote: res.quote,
    };
  }
  return {
    type: res.type === "lines" ? "normal" : res.type,
    lines: [
      capitaliseLines(
        parts.map((part) =>
          typeof part === "string"
            ? part
            : sliceLines(res.lines, part.start, part.end).join(" ")
        )
      ).join(""),
    ],
    allSpecial: res.allSpecial,
    quote: res.quote,
  };
};

const getPara = (
  para: SectionContent,
  allSpecial: boolean
): SemiRenderContent => {
  if (typeof para === "string") return [{ text: para }];
  if (!Array.isArray(para)) {
    if ("type" in para) {
      if (para.type === "break") return para;
      return { type: para.type, lines: [para.text], allSpecial };
    }
    return {
      type: "lines",
      lines: para.lines
        .slice(1)
        .map((end, i) => para.text.slice(para.lines[i], end - 1)),
      allSpecial,
    };
  }
  const sources: { section: number; paragraph: number }[] = [
    ...new Set(
      para
        .filter((part) => typeof part !== "string")
        .map(({ section, paragraph }) => JSON.stringify({ section, paragraph }))
    ),
  ].map((x) => JSON.parse(x));
  if (
    sources.length === 1 &&
    para.every((part) => typeof part !== "string" || textIsConnector(part))
  ) {
    const res = getSourceParts(sources[0]!, para);
    if ("type" in res) {
      if (res.type === "break") return res;
      return { ...res, quote: getUrlQuote(sources[0]!) };
    }
    return {
      type: "normal",
      lines: [res.map((x) => x.text).join("")],
      allSpecial: false,
      quote: getUrlQuote(sources[0]!),
    };
  }
  return capitaliseQuotes(
    expandQuotes(
      para.map((part) => {
        if (typeof part === "string") return { text: part };
        return { text: getQuoteText(part), quote: getUrlQuote(part) };
      })
    )
  );
};

const getFullQuotedPara = (
  paraBase: SectionContent,
  sources: { section: number; paragraph: number }[]
): SemiRenderContent => {
  if (typeof paraBase === "string") {
    return [{ text: paraBase }];
  }
  const para = paraBase as (
    | string
    | {
        section: number;
        paragraph: number;
        start: number;
        end: number;
      }
  )[];
  if (sources.length === 1) {
    const res = getSourceParts(sources[0]!, para);
    if (!Array.isArray(res)) return res;
    return expandQuotes(res);
  }
  return para.flatMap((part, i) => {
    if (typeof part === "string") return [{ text: part }];
    const res = getPara(
      data[part.section]!.content[part.paragraph]!,
      getAllSpecial(data[part.section]!)
    );
    if ("type" in res && res.type === "break") return [];
    if (Array.isArray(res)) {
      return sliceArray(res, part.start, part.end);
    }
    return sliceLines(res.lines, part.start, part.end).map((text) => ({
      text: i === para.length - 1 ? text : `${text} `,
      quote: res.quote,
    }));
  });
};

const addQuoted = (
  para: SemiRenderContent,
  quoted: {
    start: number;
    end: number;
    section: number;
    paragraph: number;
  }[] = []
): RenderContent => {
  if ("type" in para && para.type === "break") return para;
  const indices = [...new Set(quoted.flatMap((q) => [q.start, q.end]))].sort(
    (a, b) => a - b
  );
  if (Array.isArray(para)) {
    let current = 0;
    return para.flatMap((part) => {
      const partIndices = [
        0,
        ...indices
          .map((x) => x - current)
          .filter((x) => x > 0 && x < part.text.length),
        part.text.length,
      ];
      const res = partIndices.slice(1).map((end, i) => {
        const start = partIndices[i]!;
        return {
          text: part.text.slice(start, end),
          quote: part.quote,
          quoted: quoted.filter(
            (q) => current + start >= q.start && current + end <= q.end
          ).length,
        };
      });
      current += part.text.length;
      return res;
    });
  }
  let current = 0;
  return {
    ...para,
    lines: para.lines.map((part) => {
      const partIndices = [
        0,
        ...indices
          .map((x) => x - current)
          .filter((x) => x > 0 && x < part.length),
        part.length,
      ];
      const res = partIndices.slice(1).map((end, i) => {
        const start = partIndices[i]!;
        return {
          text: part.slice(start, end),
          quoted: quoted.filter(
            (q) => current + start >= q.start && current + end <= q.end
          ).length,
        };
      });
      current += part.length + 1;
      return res;
    }),
  };
};

const joinAdjacentQuotes = (
  parts: { text: string; quote?: true | Quote; quoted: number }[]
) => {
  const quotes = parts.filter((part) => typeof part.quote === "object");
  for (let i = 0; i < quotes.length - 1; i++) {
    const current = quotes[i]!;
    const next = quotes[i + 1]!;
    if (JSON.stringify(current.quote) === JSON.stringify(next.quote)) {
      current.quote = true;
    }
  }
  return parts;
};

const filterQuoted = (
  para: RenderContent,
  level: number
): RenderContent | null => {
  if ("type" in para && para.type === "break") return para;
  if (Array.isArray(para)) {
    const res: any[] = [];
    for (const part of para) {
      const prevNull = res[res.length - 1] === null;
      if (part.quoted >= level) {
        if (part.text.startsWith(". . .") && prevNull) res.pop();
        res.push(part);
      } else if (
        !prevNull &&
        !(res[res.length - 1]?.text || "").endsWith(". . .")
      ) {
        res.push(null);
      }
    }
    if (res.length === 1 && res[0] === null) return null;
    return joinAdjacentQuotes(
      res.map((part, i) => {
        if (part !== null) return part;
        if (i === 0) {
          if (res[i + 1].text.startsWith(". . .")) return null;
          return { text: ". . . ", quoted: 0 };
        }
        if (i === res.length - 1) {
          if (res[i - 1].text.endsWith(". . .")) return null;
          return { text: " . . .", quoted: 0 };
        }
        return { text: " . . . ", quoted: 0 };
      })
    );
  }
  const lines = para.lines.map((line) => {
    const res: any[] = [];
    for (const part of line) {
      const prevNull = res[res.length - 1] === null;
      if (part.quoted >= level) {
        if (part.text.startsWith(". . .") && prevNull) res.pop();
        res.push(part);
      } else if (
        !prevNull &&
        !(res[res.length - 1]?.text || "").endsWith(". . .")
      ) {
        res.push(null);
      }
    }
    return res.length === 1 && res[0] === null ? [] : res;
  });
  let started = false;
  lines.forEach((line, i) => {
    if (line.length === 0) {
      if (started) {
        let prev = lines[i - 1]!;
        if (prev.length > 0 && prev[prev.length - 1] !== null) {
          prev.push(null);
        }
      } else {
        let next = lines[i + 1];
        if (next && next.length > 0 && next[0] !== null) {
          next.unshift(null);
        }
      }
    } else {
      started = true;
    }
  });
  if (lines.every((line) => line.length === 0)) return null;
  return {
    ...para,
    lines: lines
      .filter((line) => line.length > 0)
      .map((line) =>
        line.map((part, i) => {
          if (part !== null) return part;
          if (i === 0) return { text: ". . . ", quoted: 0 };
          if (i === line.length - 1) return { text: " . . .", quoted: 0 };
          return { text: " . . . ", quoted: 0 };
        })
      ),
  };
};

const alternateQuoteMarks = (
  para: RenderContent | null
): RenderContent | null => {
  if (para === null) return para;
  if ("type" in para && para.type === "break") return para;
  if (Array.isArray(para)) {
    let level = 1;
    for (const part of para) {
      let res = "";
      for (let i = 0; i < part.text.length; i++) {
        if (part.text[i] === "“") {
          level++;
          if (level % 2 === 0) res += "“";
          else res += "‘";
        } else if (part.text[i] === "”") {
          if (level % 2 === 0) res += "”";
          else res += "’";
          level--;
        } else {
          res += part.text[i];
        }
      }
      part.text = res;
    }
    return para;
  }
  let level = 1;
  for (const line of para.lines) {
    for (const part of line) {
      let res = "";
      for (let i = 0; i < part.text.length; i++) {
        if (part.text[i] === "“") {
          level++;
          if (level % 2 === 0) res += "“";
          else res += "‘";
        } else if (part.text[i] === "”") {
          if (level % 2 === 0) res += "”";
          else res += "’";
          level--;
        } else {
          res += part.text[i];
        }
      }
      part.text = res;
    }
  }
  return para;
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
    const paraQuoted = section.content.map((_, paraIndex) => {
      const base = section.quoted?.[paraIndex];
      if (!base) return;
      return [
        ...new Set(
          base.map(({ section, paragraph }) =>
            JSON.stringify({ section, paragraph })
          )
        ),
      ].map((q) => getUrlQuote(JSON.parse(q)));
    });
    if (
      section.content.every(
        (para) =>
          (typeof para === "string" && textIsConnector(para)) ||
          (Array.isArray(para) &&
            para.every(
              (part) => typeof part !== "string" || textIsConnector(part)
            ))
      )
    ) {
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
      return {
        ...section,
        content: section.content
          .map((para, paraIndex) => ({
            paraId: paraIds[paraIndex]!,
            content: alternateQuoteMarks(
              filterQuoted(
                addQuoted(
                  getFullQuotedPara(para, paraSources[paraIndex]!),
                  section.quoted?.[paraIndex]
                ),
                level
              )
            ),
            quoted: paraQuoted[paraIndex],
            source: displaySources[paraIndex]
              ? getUrlQuote(displaySources[paraIndex]!)
              : undefined,
          }))
          .filter((para) => para.content !== null),
      };
    }
    const allSpecial = getAllSpecial(section);
    return {
      ...section,
      content: section.content
        .map((para, paraIndex) => ({
          paraId: paraIds[paraIndex]!,
          content: alternateQuoteMarks(
            filterQuoted(
              addQuoted(getPara(para, allSpecial), section.quoted?.[paraIndex]),
              level
            )
          ),
          quoted: paraQuoted[paraIndex],
        }))
        .filter((para) => para.content !== null),
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
