import express from "express";

import type {
  FlatPara,
  MultiQuote,
  Quote,
  QuoteLink,
  Ref,
  RefQuote,
  SemiPara,
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
import { data, getAllSpecial, getParagraphIds } from "./utils.ts";

const SEARCH_COUNT = 30;

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

const getData = (
  urlPath: string[],
  baseLevel: number,
  search: string
): {
  docs: {
    sources: QuoteLink[];
    content: {
      quoted: QuoteLink[];
      quotes: QuoteLink[];
      paraId: string;
      para: SemiPara;
      ref: Ref;
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
    (urlPath.length > 2 &&
      ["bahai-sacred-writings", "bahaullah-new-era"].includes(urlPath[1]!));

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

  const baseResult: {
    paraId: string;
    para: FlatPara;
    sources: MultiQuote[];
    chars: string;
    ref: Ref;
    fullQuote: boolean;
  }[] = [];
  while (
    (!matches || baseResult.length < SEARCH_COUNT + 5) &&
    passages.length > 0
  ) {
    const { section, start, levels } = passages.shift()!;
    const paraIds = getParagraphIds(data[section]!.content);
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
          paraId: paraIds[paragraph]!,
          para: {
            text: ". . .",
            quoted: [],
            highlights: [],
            sourceQuotes: [],
            allSpecial: false,
          } as FlatPara,
          sources: [{ section, paragraph: -1, start: 0, end: 0 }],
          ref,
          fullQuote: false,
        };
      }
      if (matches) filteredPara.allSpecial = true;
      return {
        paraId: paraIds[paragraph]!,
        para: filteredPara,
        sources: filteredPara.sourceQuotes.map((q) => q.quote),
        ref,
        fullQuote: fullQuote[index]!,
      };
    });

    let readyBreak = false;
    let readyDots = false;
    const merged: {
      paraId: string;
      para: FlatPara;
      sources: Quote[];
      ref: Ref;
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

    const joinedSources = joinQuotes(merged.map((p) => p.sources));
    const mappedSources = merged.map((p, i) => ({
      ...p,
      sources: joinedSources[i]!,
      chars: toChars(toWords(toCleaned(p.para.text))),
    }));

    if (!matches) {
      baseResult.push(...mappedSources);
    } else {
      const dupe = baseResult
        .slice(-5)
        .findIndex((x) =>
          mappedSources.some(({ chars }) => chars.includes(x.chars))
        );
      if (dupe !== -1) {
        baseResult.splice(
          Math.max(0, baseResult.length - 5) + dupe,
          1,
          ...mappedSources
        );
      } else if (
        mappedSources.some(
          ({ chars }) => !baseResult.some((x) => x.chars.includes(chars))
        )
      ) {
        baseResult.push(...mappedSources);
      }
    }
  }

  const result = baseResult.map(({ para, paraId, sources, ref, fullQuote }) => {
    if (matches) {
      para.highlights = getTokenHighlights(para.text, matches.tokens);
    }
    return {
      paraId,
      para: {
        ...para,
        quotes: para.quotes?.map((q) => ({
          quote: q,
          render: getUrlQuote(q.quote),
        })),
      },
      quotes: fullQuote ? para.quotes?.map((q) => q.quote) : undefined,
      quoted: para.quoted.sort((aQuote, bQuote) => {
        const aDoc = data[aQuote.quote.section]!;
        const bDoc = data[bQuote.quote.section]!;
        return compareArrays(
          aDoc.path.map((p: [string, string, number]) => p[2]),
          bDoc.path.map((p: [string, string, number]) => p[2])
        );
      }),
      sources,
      ref,
    };
  });

  const joinedQuotes = joinQuotes(result.map((r) => r.quotes || []));
  const mappedQuotes = result.map((r, i) => ({
    ...r,
    quotes: joinedQuotes[i]!,
  }));

  const docs = [
    {
      sources: [] as MultiQuote[],
      content: [] as {
        paraId: string;
        para: SemiPara;
        quoted: RefQuote[];
        quotes: MultiQuote[];
        ref: Ref;
      }[],
    },
  ];
  for (const { sources, ...para } of mappedQuotes) {
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

  let sliceIndex: number | undefined = 0;
  if (matches) {
    let totalParas = 0;
    while (totalParas < SEARCH_COUNT && sliceIndex < docs.length) {
      totalParas += docs[sliceIndex++]!.content.length;
    }
  } else {
    sliceIndex = undefined;
  }

  return {
    docs: docs
      .slice(0, sliceIndex)
      .filter((d) => {
        if (d.content.length === 0) {
          return false;
        }
        if (
          d.sources.length > 0 &&
          d.content.length === 1 &&
          d.content[0]!.para.text === ". . ."
        ) {
          return false;
        }
        return true;
      })
      .map((d) => ({
        sources: d.sources.map((q) => ({
          quotes: q.quotes,
          render: getUrlQuote(q),
        })),
        content: d.content.map((p) => {
          const quotedQuotes = p.quoted.map((q) => q.quote);
          const quoted = uniqueRefs(quotedQuotes)
            .map((ref) => ({
              section: ref.section,
              paragraph: [ref.paragraph],
              quotes: quotedQuotes.filter((q) => refsEqual(ref, q)),
            }))
            .map((q) => ({
              quotes: q.quotes,
              render: getUrlQuote(q),
            }));
          return {
            ...p,
            quoted: quoted.filter(
              (q1, i) =>
                !quoted
                  .slice(i + 1)
                  .some(
                    (q2) =>
                      JSON.stringify(q1.render) === JSON.stringify(q2.render)
                  )
            ),
            quotes: p.quotes.map((q) => ({
              quotes: q.quotes,
              render: getUrlQuote(q),
            })),
          };
        }),
      })),
    path,
    tree: nestedTree,
    showContent: true,
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
