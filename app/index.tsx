import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  ScrollRestoration,
  useLoaderData,
  useLocation,
} from "react-router";

import type { Range, Ref, RenderQuote, SemiPara } from "../utils/types";
import { moveRange, refsEqual, textIsConnector } from "../utils/utils";

import App from "./App";
import { getRenderContent } from "./render";
import { SizeContext } from "./Utils";

const getSplitText = (text: string) => {
  let current = 0;
  const res: { text: string; start: number }[] = [];
  res.push({ text, start: 0 });
  for (const part of text.split(/( ?\. \. \. ?| ?\[[^\]]*\] ?)/)) {
    if (!textIsConnector(part)) {
      res.push({ text: part, start: current });
    }
    current += part.length;
  }
  return res;
};

const getOverlapRange = (base: string, pattern: string) => {
  for (let offset = -pattern.length + 1; offset < base.length; offset++) {
    const baseStart = Math.max(0, offset);
    const baseEnd = Math.min(base.length, offset + pattern.length);

    const patternStart = Math.max(0, -offset);
    const patternEnd = patternStart + (baseEnd - baseStart);

    const baseSlice = base.slice(baseStart, baseEnd);
    const patternSlice = pattern.slice(patternStart, patternEnd);

    if (baseSlice === patternSlice) return { start: baseStart, end: baseEnd };
  }
  return null;
};

const getHighlights = (para: string, ranges: Range[], text: string[]) => {
  console.log(para);
  console.log(ranges);
  console.log(text);
  const patterns = text.flatMap((t) => getSplitText(t.toLowerCase()));
  const res = ranges
    .flatMap((range) => {
      const base = getSplitText(
        para.slice(range.start, range.end).toLowerCase()
      );
      return patterns.flatMap((p) =>
        base.flatMap((b) => {
          const overlap = getOverlapRange(b.text, p.text);
          return overlap ? [moveRange(overlap, range.start + b.start)] : [];
        })
      );
    })
    .sort((a, b) => a.start - b.start);
  return res;
};

const Root = () => {
  const {
    docs: baseDocs,
    path,
    tree,
    showContent,
  } = useLoaderData<{
    docs: {
      sources: RenderQuote[];
      content: {
        quoted: RenderQuote[];
        quotes: RenderQuote[];
        paraId: string;
        para: SemiPara;
        ref: Ref;
      }[];
    }[];
    path: [string, string][];
    tree: any;
    showContent: boolean;
  }>();

  const location = useLocation();

  console.log(location.state);

  const docs = baseDocs.map((d) => ({
    sources: d.sources,
    content: d.content.map((c) => {
      if (location.state) {
        if (location.state.type === "quote") {
          c.para.highlights.push(
            ...getHighlights(
              c.para.text,
              [
                ...(c.para.quotes || [])
                  .filter((q) => refsEqual(q.base, location.state.ref))
                  .map((q) => q.base),
                ...c.para.sourceQuotes.filter((q) =>
                  refsEqual(q, location.state.ref)
                ),
              ],
              location.state.text
            )
          );
        } else if (location.state.type === "quoted") {
          c.para.highlights.push(
            ...getHighlights(
              c.para.text,
              c.para.quoted.filter((q) => refsEqual(q, location.state.ref)),
              location.state.text
            )
          );
        } else if (location.state.type === "source") {
          if (location.state.refs.some((ref: Ref) => refsEqual(ref, c.ref))) {
            c.para.highlights.push(
              ...getHighlights(
                c.para.text,
                [{ start: 0, end: c.para.text.length }],
                location.state.text
              )
            );
          }
        }
      }
      return {
        ...c,
        content: getRenderContent(c.para),
      };
    }),
  }));
  return (
    <SizeContext value={17}>
      <ScrollRestoration />
      <App docs={docs} path={path} tree={tree} showContent={showContent} />
    </SizeContext>
  );
};

const route = {
  Component: Root,
  loader: async ({ params, request }: any) => {
    const { path1, path2, path3, path4, path5, path6, path7 } = params;
    const paramPath = [path1, path2, path3, path4, path5, path6, path7].filter(
      (p) => p
    ) as string[];
    const searchParams = new URL(request.url).searchParams;
    const level = parseInt(searchParams.get("level") || "0", 10);
    const search = searchParams.get("search") || "";
    const res = await fetch(
      process.env.NODE_ENV === "local"
        ? `http://localhost:8000/api/${encodeURIComponent(
            JSON.stringify({ path: paramPath, level, search })
          )}`
        : `/api/${encodeURIComponent(
            JSON.stringify({ path: paramPath, level, search })
          )}`
    );
    return await res.json();
  },
};

const router = createBrowserRouter([
  {
    path: "/:path1?/:path2?/:path3?/:path4?/:path5?/:path6?/:path7?",
    ...route,
  },
]);

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);
