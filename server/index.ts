import type { Ref } from "../utils/types";
import {
  compareArrays,
  textIsConnector,
  toChars,
  toCleaned,
  toWords,
} from "../utils/utils";

import {
  addSourceQuotes,
  filterQuoted,
  getFullQuotedPara,
  getPara,
  getParaQuotes,
} from "./paragraph";
import { getUrlQuote } from "./quote";
import { getMatches, getTokenHighlights } from "./search";
import type { FlatPara, MultiRef, RenderQuote } from "./utils";
import { data, getAllSpecial, getParagraphIds, mergeQuotes } from "./utils";

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

const joinQuotes = (quotes: MultiRef[][]) => {
  for (let i = 0; i < quotes.length - 1; i++) {
    if (quotes[i]!.length === 1 && quotes[i + 1]?.length === 1) {
      const current = quotes[i]![0]!;
      const next = quotes[i + 1]![0]!;
      if (
        current.section === next.section &&
        (next.paragraph.length === 0 ||
          current.paragraph[current.paragraph.length - 1]! <=
            next.paragraph[0]!)
      ) {
        next.paragraph = [...current.paragraph, ...next.paragraph];
        quotes[i] = [];
      }
    }
  }
  return quotes;
};

const getData = (
  urlPath: string[],
  baseLevel: number,
  search: string
): {
  docs: {
    sources: RenderQuote[];
    content: {
      quoted: RenderQuote[];
      quotes: RenderQuote[];
      paraId: string;
      para: FlatPara;
    }[];
  }[];
  path: [string, string][];
  tree: any;
  showContent: boolean;
} => {
  const filteredSections = data
    .map((section, index) => ({ section, index }))
    .filter(({ section }) =>
      urlPath.every((p, i) => section.path[i]?.[1] === p)
    )
    .map(({ index }) => index);

  const matches = getMatches(filteredSections, search, baseLevel);

  const searchSections = matches
    ? filteredSections.filter((section) =>
        matches.matches.some((m) => m.section === section)
      )
    : filteredSections;

  const filteredTree = {} as any;
  for (const section of filteredSections) {
    data[section]!.path.reduce((res, p) => {
      const key = JSON.stringify([p[0], p[1]]);
      return (res[key] = res[key] || {});
    }, filteredTree);
  }
  const [path] = collapseSingleKeys(filteredTree, urlPath.length);

  const searchTree = {} as any;
  for (const section of searchSections) {
    data[section]!.path.reduce((res, p) => {
      const key = JSON.stringify([p[0], p[1]]);
      return (res[key] = res[key] || {});
    }, searchTree);
  }
  const [_, nestedTree] = collapseSingleKeys(searchTree, urlPath.length);

  const showContent =
    matches ||
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

  if (!showContent) {
    return { docs: [], path, tree: nestedTree, showContent: false };
  }

  const passages: {
    section: number;
    start: number;
    levels: (null | number)[];
  }[] =
    matches?.matches ||
    filteredSections.map((section) => {
      const d = data[section]!;
      return {
        section,
        start: 0,
        levels: Array.from<number>({ length: d.content.length }).fill(
          baseLevel
        ),
      };
    });

  const baseResult: { paraId: string; para: FlatPara; sources: MultiRef[] }[] =
    [];
  while ((!matches || baseResult.length < 30) && passages.length > 0) {
    const { section, start, levels } = passages.shift()!;
    const paraIds = getParagraphIds(data[section]!.content);
    const allSpecial = getAllSpecial(data[section]!.content);
    const sliced = data[section]!.content.slice(start, start + levels.length);
    const allFullQuote = sliced.every((para) => {
      if (typeof para === "string") {
        return textIsConnector(para);
      }
      if (Array.isArray(para)) {
        return para.every(
          (part) => typeof part !== "string" || textIsConnector(part)
        );
      }
      return "type" in para && para.type === "break";
    });
    const content = sliced.map((para, index) => {
      const paragraph = index + start;
      const filteredPara =
        levels[index] === null
          ? null
          : filterQuoted(
              allFullQuote
                ? getFullQuotedPara(para)
                : addSourceQuotes(getPara(para, allSpecial), {
                    section,
                    paragraph,
                  }),
              data[section]!.quoted?.[paragraph] || [],
              levels[index]!
            );
      if (!filteredPara) {
        return {
          paraId: paraIds[paragraph]!,
          para: {
            text: ". . .",
            quoted: [],
            highlights: [],
            sourceQuotes: [],
            allSpecial: false,
          } as FlatPara,
          sources: [{ section, paragraph: [] }],
        };
      }
      if (matches) filteredPara.allSpecial = true;
      return {
        paraId: paraIds[paragraph]!,
        para: filteredPara,
        sources: allFullQuote
          ? mergeQuotes(
              Array.isArray(para)
                ? para.filter((part) => typeof part !== "string")
                : []
            )
          : [{ section, paragraph: [paragraph] }],
      };
    });
    if (
      !matches ||
      content.some(
        ({ para }) =>
          !baseResult.some((x) =>
            toChars(toWords(toCleaned(x.para.text))).includes(
              toChars(toWords(toCleaned(para.text)))
            )
          )
      )
    ) {
      let readyBreak = false;
      let readyDots = false;
      const merged: { paraId: string; para: FlatPara; sources: MultiRef[] }[] =
        [];
      for (const p of content) {
        if (p.para.type === "break") {
          if (readyBreak) {
            merged.push(p);
            readyBreak = false;
            readyDots = true;
          }
        } else if (p.para.text === ". . .") {
          if (readyDots) {
            merged.push(p);
            readyDots = false;
          }
        } else {
          merged.push(p);
          readyBreak = true;
          readyDots = true;
        }
      }
      if (merged.length > 0) {
        if (merged[merged.length - 1]!.para.text === ". . .") {
          merged.pop();
        }
        if (merged[merged.length - 1]!.para.type === "break") {
          merged.pop();
        }
        if (merged[merged.length - 1]!.para.text === ". . .") {
          merged.pop();
        }
      }
      const joinedSources = joinQuotes(merged.map((c) => c.sources));
      baseResult.push(
        ...merged.map((p, i) => ({ ...p, sources: joinedSources[i]! }))
      );
    }
  }

  const result = baseResult.map(({ para, paraId, sources }) => {
    if (matches) {
      para.highlights = getTokenHighlights(para.text, matches.tokens);
    }
    return {
      paraId,
      para,
      quotes: getParaQuotes(para).quotes,
      quoted: para.quoted.sort((aQuote, bQuote) => {
        const aDoc = data[aQuote.section]!;
        const bDoc = data[bQuote.section]!;
        return compareArrays(
          aDoc.path.map((p: [string, string, number]) => p[2]),
          bDoc.path.map((p: [string, string, number]) => p[2])
        );
      }),
      sources,
    };
  });

  const docs = [
    {
      sources: [] as MultiRef[],
      content: [] as {
        paraId: string;
        para: FlatPara;
        quoted: Ref[];
        quotes: MultiRef[];
      }[],
    },
  ];
  for (const { sources, ...para } of result) {
    if (sources.length > 1) {
      docs.push({ sources, content: [para] }, { sources: [], content: [] });
    } else {
      docs[docs.length - 1]!.content.push(para);
      if (sources.length === 1) {
        docs[docs.length - 1]!.sources = sources;
        docs.push({ sources: [], content: [] });
      }
    }
  }

  return {
    docs: docs
      .filter((d) => d.content.length > 0)
      .map((d) => {
        const joinedQuotes = joinQuotes(d.content.map((c) => c.quotes));
        return {
          sources: d.sources.map((q) => getUrlQuote(q)),
          content: d.content.map((p, i) => ({
            ...p,
            quoted: [
              ...new Set(p.quoted.map((q) => JSON.stringify(getUrlQuote(q)))),
            ].map((q) => JSON.parse(q)) as RenderQuote[],
            quotes: joinedQuotes[i]!.map((q) => getUrlQuote(q)),
          })),
        };
      }),
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
