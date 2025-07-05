import type { Ref } from "../utils/types";
import { compareArrays, textIsConnector } from "../utils/utils";

import {
  filterQuoted,
  getFullQuotedPara,
  getPara,
  getRenderContent,
} from "./paragraph";
import { getUrlQuote } from "./quote";
import { getMatches, highlightTokens } from "./search";
import type { MultiRef, RenderContent, RenderQuote } from "./utils";
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

  const matches = getMatches(search);

  const filtered = data
    .map((section, index) => ({ section, index }))
    .filter(
      ({ section, index }) =>
        urlPath.every((p, i) => section.path[i]?.[1] === p) &&
        (!matches ||
          matches.some((m) =>
            m.matches.some(
              (x) =>
                x.section === index && x.scores.some((y) => y.level >= level)
            )
          ))
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
    return { data: [], path, tree: nestedTree, showContent: false };
  }

  const result = filtered.flatMap(({ section, index }) => {
    const paraIds = getParagraphIds(section.content);
    const allFullQuote = section.content.every((para) => {
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
    const allSpecial = getAllSpecial(section.content);
    const content = section.content.map((para, paraIndex) => {
      const base = { paraId: paraIds[paraIndex]!, quoted: [], quotes: [] };
      const notInSearch =
        matches &&
        !matches.some((m) =>
          m.matches.some(
            (x) =>
              x.section === index &&
              x.paragraph === paraIndex &&
              x.scores.some((y) => y.level >= level)
          )
        );
      const filteredPara = notInSearch
        ? null
        : filterQuoted(
            allFullQuote
              ? getFullQuotedPara(para)
              : getPara(para, section.quoted?.[paraIndex], allSpecial),
            level
          );
      if (!filteredPara) {
        return {
          ...base,
          content: [
            { text: ". . .", quoted: 0, highlight: false },
          ] as RenderContent,
          sources: [{ section: index, paragraph: [] }],
        };
      }
      const highlightedPara = highlightTokens(
        filteredPara,
        (matches || []).map((m) => m.token)
      );
      return {
        ...base,
        ...getRenderContent(highlightedPara),
        quoted: highlightedPara.quoted
          .map((q) => q.quote)
          .sort((aQuote, bQuote) => {
            const aDoc = data[aQuote.section]!;
            const bDoc = data[bQuote.section]!;
            return compareArrays(
              aDoc.path.map((p: [string, string, number]) => p[2]),
              bDoc.path.map((p: [string, string, number]) => p[2])
            );
          }),
        sources: allFullQuote
          ? mergeQuotes(
              Array.isArray(para)
                ? para.filter((part) => typeof part !== "string")
                : []
            )
          : [{ section: index, paragraph: [paraIndex] }],
      };
    });
    let readyBreak = false;
    let readyDots = false;
    const merged: any[] = [];
    for (const p of content) {
      if ((p.content as any).type === "break") {
        if (readyBreak) {
          merged.push(p);
          readyBreak = false;
          readyDots = true;
        }
      } else if ((p.content as any)[0]?.text === ". . .") {
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
      if ((merged[merged.length - 1]!.content as any)[0]?.text === ". . .") {
        merged.pop();
      }
      if ((merged[merged.length - 1]!.content as any)[0]?.type === "break") {
        merged.pop();
      }
      if ((merged[merged.length - 1]!.content as any)[0]?.text === ". . .") {
        merged.pop();
      }
    }
    const joinedSources = joinQuotes(merged.map((c) => c.sources));
    return merged.map((p, i) => ({ ...p, sources: joinedSources[i]! }));
  });

  const docs = [
    {
      sources: [] as MultiRef[],
      content: [] as {
        paraId: string;
        content: RenderContent;
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
    data: docs
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
