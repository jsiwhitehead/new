import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  ScrollRestoration,
  useLoaderData,
} from "react-router";

import type { DocSlice } from "../utils/types";

import App from "./App";
import { SizeContext } from "./Utils";

const Root = () => {
  const { docs, path, tree, showContent } = useLoaderData<{
    docs: DocSlice[];
    path: [string, string][];
    tree: any;
    showContent: boolean;
  }>();

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
