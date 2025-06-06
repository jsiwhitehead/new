import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";

import App from "./App";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/:path1",
    element: <App />,
  },
  {
    path: "/:path1/:path2",
    element: <App />,
  },
  {
    path: "/:path1/:path2/:path3",
    element: <App />,
  },
  {
    path: "/:path1/:path2/:path3/:path4",
    element: <App />,
  },
  {
    path: "/:path1/:path2/:path3/:path4/:path5",
    element: <App />,
  },
  {
    path: "/:path1/:path2/:path3/:path4/:path5/:path6",
    element: <App />,
  },
  {
    path: "/:path1/:path2/:path3/:path4/:path5/:path6/:path7",
    element: <App />,
  },
]);

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);
