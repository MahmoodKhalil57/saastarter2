import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./index.css";
import { runtimeBasename } from "./config";
import { Layout } from "./Layout";
import { UiProvider } from "./ui";
import { HomePage } from "./pages/Home";
import { BlogPage } from "./pages/Blog";
import { PostPage } from "./pages/Post";
import { ContactPage } from "./pages/Contact";
import { LoginPage } from "./pages/Login";
import { AccountPage } from "./pages/Account";
import { AdminGate } from "./admin";
import {
  AdminIndexPage,
  AdminListPage,
  AdminNewPage,
  AdminEditPage,
} from "hono-aep-ui";
import { CmsPage, CmsPageError } from "hono-aep-blocks";
import { config } from "./config";

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
        { path: "login", Component: LoginPage },
        { path: "account", Component: AccountPage },
        { path: "admin", element: <AdminGate><AdminIndexPage /></AdminGate> },
        { path: "admin/:plural", element: <AdminGate><AdminListPage /></AdminGate> },
        { path: "admin/:plural/new", element: <AdminGate><AdminNewPage /></AdminGate> },
        { path: "admin/:plural/:id", element: <AdminGate><AdminEditPage /></AdminGate> },
        {
          // "A cms for some pages": any path that is not a code route tries
          // the project's hosted Puck pages (public read, CORS-open).
          path: "*",
          Component: CmsPage,
          ErrorBoundary: CmsPageError,
          loader: async ({ params }) => {
            const slug = (params["*"] as string) || "home";
            const response = await fetch(
              `${config.endpoint}/v1/projects/${config.project}/pages/${slug}`,
            );
            if (!response.ok) throw new Response("Not found", { status: response.status });
            const doc = (await response.json()) as { title: string; data: unknown };
            return { slug, title: doc.title, data: doc.data };
          },
        },
      ],
    },
  ],
  { basename: runtimeBasename() },
);

createRoot(document.getElementById("root")!).render(
  <UiProvider>
    <RouterProvider router={router} />
  </UiProvider>,
);
