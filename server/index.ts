import express from "express";

import type {
  DocSlice,
  FlatPara,
  MultiQuote,
  Passage,
  Quote,
  Ref,
} from "../utils/types.ts";
import {
  compareArrays,
  joinQuotes,
  refsEqual,
  textIsConnector,
  toChars,
  toCleaned,
  toWords,
  uniqueRefs,
} from "../utils/utils.ts";

import { filterQuoted, getFullQuotedPara, getPara } from "./paragraph.ts";
import { getUrlQuote } from "./quote.ts";
import { getMatches, getTokenHighlights } from "./search.ts";
import {
  data,
  getAllSpecial,
  getFilterSections,
  getParagraphIds,
  getPathSections,
} from "./utils.ts";

const SEARCH_COUNT = 20;

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

const getPassages = (urlPath: string[], baseLevel: number, search: string) => {
  const allFilterSections = getPathSections(urlPath);

  const matches = getMatches(allFilterSections, search, baseLevel);

  if (!matches) {
    const tree = {} as any;
    for (const section of allFilterSections) {
      data[section]!.path.reduce((res, p, i) => {
        const key = JSON.stringify([
          i === data[section]!.path.length - 1 && data[section]!.extract
            ? `${p[0]}: ${data[section]!.extract}`
            : p[0],
          p[1],
        ]);
        return (res[key] = res[key] || {});
      }, tree);
    }
    const [path, nestedTree] = collapseSingleKeys(tree, urlPath.length);

    const passages: Passage[] = (
      urlPath.length === 2 && urlPath[1] === "hidden-words"
        ? [
            ...getFilterSections([
              "bahaullah",
              "hidden-words",
              "part-one-from-the-arabic",
            ]),
            ...getFilterSections([
              "bahaullah",
              "hidden-words",
              "part-two-from-the-persian",
            ]),
          ]
        : getFilterSections(urlPath)
    ).map((section) => {
      const d = data[section]!;
      return {
        section,
        start: 0,
        levels: Array.from<number>({ length: d.content.length }).fill(
          baseLevel
        ),
        score: 0,
        scoreInfo: {},
      };
    });

    return {
      path,
      tree: nestedTree,
      passages,
      showContent: passages.length > 0,
    };
  }

  const matchSections = new Set(matches.matches.map((m) => m.section));
  const searchSections = allFilterSections.filter((section) =>
    matchSections.has(section)
  );

  const filteredTree = {} as any;
  for (const section of allFilterSections) {
    data[section]!.path.reduce((res, p) => {
      const key = JSON.stringify([p[0], p[1]]);
      return (res[key] = res[key] || {});
    }, filteredTree);
  }
  const [path] = collapseSingleKeys(filteredTree, urlPath.length);

  const searchTree = {} as any;
  for (const section of searchSections.filter((s) => !data[s]!.meta)) {
    data[section]!.path.reduce((res, p, i) => {
      const key = JSON.stringify([
        i === data[section]!.path.length - 1 && data[section]!.extract
          ? `${p[0]}: ${data[section]!.extract}`
          : p[0],
        p[1],
      ]);
      return (res[key] = res[key] || {});
    }, searchTree);
  }
  const [_, nestedTree] = collapseSingleKeys(searchTree, urlPath.length);

  return {
    path,
    tree: nestedTree,
    passages: matches.matches,
    tokens: matches.tokens,
    showContent: true,
  };
};

const mapPassage = (
  { section, start, levels, scoreInfo }: Passage,
  tokens?: string[]
): DocSlice => {
  const paraIds = getParagraphIds(section);
  const allSpecial = getAllSpecial(data[section]!.content);
  const sliced = data[section]!.content.slice(start, start + levels.length);
  const fullQuote = sliced.map((para) => {
    if (typeof para === "string") {
      return textIsConnector(para);
    }
    if (Array.isArray(para)) {
      return (
        para.every(
          (part) => typeof part !== "string" || textIsConnector(part)
        ) && para.some((part) => typeof part !== "string")
      );
    }
    return "type" in para && para.type === "break";
  });
  const allFullQuote = fullQuote.every((x) => x);
  const content = sliced.map((para, index) => {
    const paragraph = index + start;
    const ref = { section, paragraph };
    const filteredPara =
      levels[index] === null
        ? null
        : filterQuoted(
            allFullQuote ? getFullQuotedPara(para) : getPara(ref, allSpecial),
            data[section]!.quoted?.[paragraph] || [],
            levels[index]!
          );
    if (!filteredPara) {
      return {
        ref,
        paraId: paraIds[paragraph]!,
        para: {
          text: ". . .",
          quoted: [],
          highlights: [],
          sourceQuotes: [],
          allSpecial: false,
        } as FlatPara,
        sources: [],
        fullQuote: false,
      };
    }
    // if (tokens) filteredPara.allSpecial = true;
    return {
      ref,
      sources: filteredPara.sourceQuotes.map((q) => q.quote),
      paraId: paraIds[paragraph]!,
      para: filteredPara,
      fullQuote: fullQuote[index]!,
    };
  });

  let readyBreak = false;
  let readyDots = false;
  const merged: {
    ref: Ref;
    paraId: string;
    para: FlatPara;
    sources: Quote[];
    fullQuote: boolean;
  }[] = [];
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

  const sources = joinQuotes(merged.map((p) => p.sources));
  const mappedSources = merged.map((p, i) => ({ ...p, sources: sources[i]! }));

  const chunks: {
    sources: MultiQuote[];
    content: { paraId: string; para: FlatPara; ref: Ref; fullQuote: boolean }[];
  }[] = [{ sources: [], content: [] }];
  for (const { sources, ...para } of mappedSources) {
    if (sources.length > 1) {
      chunks.push({ sources, content: [para] }, { sources: [], content: [] });
    } else {
      chunks[chunks.length - 1]!.content.push(para);
      if (sources.length === 1) {
        chunks[chunks.length - 1]!.sources = sources;
        chunks.push({ sources: [], content: [] });
      }
    }
  }

  const titleQuotes = tokens
    ? mappedSources.flatMap((p) =>
        p.para.sourceQuotes.map((q) => ({ ...p.ref, ...q.range }))
      )
    : [];
  const res = {
    title: {
      quotes: titleQuotes,
      render: getUrlQuote(
        { section, paragraph: [], quotes: titleQuotes },
        false
      ),
    },
    scoreInfo,
    chunks: chunks
      .filter((x) => x.content.length !== 0)
      .map((x) => {
        const joinedQuotes = joinQuotes(
          x.content.map(
            (r) => (r.fullQuote && r.para.quotes?.map((q) => q.quote)) || null
          )
        );
        return {
          sources:
            allFullQuote || tokens
              ? x.sources.map((q) => ({
                  quotes: q.quotes,
                  render: getUrlQuote(q, true),
                }))
              : [],
          content: x.content.map(({ para, paraId, ref }, i) => {
            const quotedQuotes = para.quoted.map((q) => q.quote);
            const quoted = uniqueRefs(quotedQuotes)
              .sort((aQuote, bQuote) => {
                const aDoc = data[aQuote.section]!;
                const bDoc = data[bQuote.section]!;
                return compareArrays(
                  aDoc.path.map((p: [string, string, number]) => p[2]),
                  bDoc.path.map((p: [string, string, number]) => p[2])
                );
              })
              .map((ref) => ({
                section: ref.section,
                paragraph: [ref.paragraph],
                quotes: quotedQuotes.filter((q) => refsEqual(ref, q)),
              }));
            return {
              paraId,
              para: {
                ...para,
                highlights: getTokenHighlights(para.text, tokens || []),
                quotes: para.quotes?.map((q) => ({
                  quote: q,
                  render: getUrlQuote(q.quote, true),
                }))!,
              },
              quotes: joinedQuotes[i]!.map((q) => ({
                quotes: q.quotes,
                render: getUrlQuote(q, true),
              })),
              quoted: quoted.map((q) => ({
                quotes: q.quotes,
                render: getUrlQuote(q, true),
              })),
              ref,
            };
          }),
        };
      }),
  };

  if (
    tokens &&
    res.chunks.length === 1 &&
    res.chunks[0]!.sources.length === 1
  ) {
    res.title = res.chunks[0]!.sources[0]!;
    res.chunks[0]!.sources = [];
  }

  return res;

  //   .filter((d) => {
  //   if (d.content.length === 0) {
  //     return false;
  //   }
  //   if (
  //     d.sources.length > 0 &&
  //     d.content.length === 1 &&
  //     d.content[0]!.para.text === ". . ."
  //   ) {
  //     return false;
  //   }
  //   return true;
  // })
};

const getData = (
  urlPath: string[],
  baseLevel: number,
  search: string
): {
  docs: DocSlice[];
  path: [string, string][];
  tree: any;
  showContent: boolean;
} => {
  const { path, tree, passages, tokens, showContent } = getPassages(
    urlPath,
    baseLevel,
    search
  );

  let baseResult: DocSlice[] = [];
  while (
    (!tokens || baseResult.length < SEARCH_COUNT + 5) &&
    passages.length > 0
  ) {
    const mapped = mapPassage(passages.shift()!, tokens);
    if (mapped.chunks.length > 0) baseResult.push(mapped);

    if (tokens) {
      const chars = baseResult.map((x) =>
        x.chunks.flatMap((c) =>
          c.content.flatMap((p) =>
            toChars(toWords(toCleaned(p.para.text.replace(/\[[^\]]*\]/g, ""))))
          )
        )
      );
      for (let i = 0; i < baseResult.length; i++) {
        if (
          [...chars.slice(i - 5, i), ...chars.slice(i + 1, i + 6)].some((x) =>
            chars[i]!.every((s1) => x.some((s2) => s2.includes(s1)))
          )
        ) {
          chars[i] = [];
        }
      }
      baseResult = baseResult.filter((_, i) => chars[i]!.length > 0);
    }
  }

  return {
    docs: tokens ? baseResult.slice(0, SEARCH_COUNT) : baseResult,
    path,
    tree,
    showContent,
  };
};

const app = express();
const port = 8000;

app.get("/api/:query", (req, res) => {
  // try {
  const { query } = req.params;
  const { path, level, search } = JSON.parse(query);

  const data = getData(path, level, search);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.json(data);
  // } catch (err) {
  //   res.status(400).json({ error: "Invalid JSON in URL parameter" });
  // }
});

app.listen(port, () => {
  console.log(`Express server running on http://localhost:${port}`);
});
