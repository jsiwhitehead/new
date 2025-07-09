import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  ScrollRestoration,
  useLoaderData,
  useLocation,
} from "react-router";

import type { QuoteLink, Ref, SemiPara } from "../utils/types";
import { refsEqual } from "../utils/utils";

import App from "./App";
import { getRenderContent } from "./render";
import { SizeContext } from "./Utils";

const Root = () => {
  const {
    docs: baseDocs,
    path,
    tree,
    showContent,
  } = useLoaderData<{
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
  }>();

  const location = useLocation();

  const docs = baseDocs.map((d) => ({
    sources: d.sources,
    content: d.content.map((c) => {
      const para = { ...c.para, highlights: [...c.para.highlights] };
      if (location.state) {
        for (const part of location.state) {
          if (refsEqual(part, c.ref)) {
            para.highlights.push({ start: part.start, end: part.end });
          }
        }
      }
      return { ...c, para, content: getRenderContent(para, c.paraId) };
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
