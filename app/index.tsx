import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  ScrollRestoration,
  useLoaderData,
  useLocation,
} from "react-router";

import type { RenderQuote, SemiPara } from "../utils/types";

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
      sources: RenderQuote[];
      content: {
        quoted: RenderQuote[];
        quotes: RenderQuote[];
        paraId: string;
        para: SemiPara;
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
      if (location.state) {
        c.para.highlights.push(
          ...location.state.flatMap((part: string) => {
            const start = c.para.text.toLowerCase().indexOf(part.toLowerCase());
            if (start === -1) return [];
            return [{ start, end: start + part.length }];
          })
        );
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
