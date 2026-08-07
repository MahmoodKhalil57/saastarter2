import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./index.css";
import { runtimeBasename } from "./config";
import { Layout } from "./Layout";
import { HomePage } from "./pages/Home";
import { BlogPage } from "./pages/Blog";
import { PostPage } from "./pages/Post";
import { ContactPage } from "./pages/Contact";

const router = createBrowserRouter(
  [
    {
      path: "/",
      Component: Layout,
      children: [
        { index: true, Component: HomePage },
        { path: "blog", Component: BlogPage },
        { path: "blog/:id", Component: PostPage },
        { path: "contact", Component: ContactPage },
      ],
    },
  ],
  { basename: runtimeBasename() },
);

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
