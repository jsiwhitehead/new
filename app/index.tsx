import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";

import App from "./App";

const route = {
  Component: App,
  loader: async ({ params }: any) => {
    const { path1, path2, path3, path4, path5, path6, path7 } = params;
    const paramPath = [path1, path2, path3, path4, path5, path6, path7].filter(
      (p) => p
    ) as string[];
    const res = await fetch(
      `http://localhost:8000/api/${encodeURIComponent(
        JSON.stringify({ path: paramPath, search: "" })
      )}`
    );
    return await res.json();
  },
};

const router = createBrowserRouter([
  { path: "/", ...route },
  { path: "/:path1", ...route },
  { path: "/:path1/:path2", ...route },
  { path: "/:path1/:path2/:path3", ...route },
  { path: "/:path1/:path2/:path3/:path4", ...route },
  { path: "/:path1/:path2/:path3/:path4/:path5", ...route },
  { path: "/:path1/:path2/:path3/:path4/:path5/:path6", ...route },
  { path: "/:path1/:path2/:path3/:path4/:path5/:path6/:path7", ...route },
]);

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);
