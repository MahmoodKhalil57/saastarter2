import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./index.css";
import { runtimeBasename } from "./config";
import { applyLocale, localeQuery } from "./locale";

applyLocale(); // lang + dir before first paint of the app tree
import { Layout } from "./Layout";
import { UiProvider } from "./ui";
import { HomePage } from "./pages/Home";
import { BlogPage } from "./pages/Blog";
import { ProductsPage } from "./pages/Products";
import { ProductDetailPage } from "./pages/ProductDetail";
import { CartPage } from "./pages/Cart";
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
        { path: "products", Component: ProductsPage },
        { path: "products/:slug", Component: ProductDetailPage },
        { path: "cart", Component: CartPage },
        { path: "changelog", Component: BlogPage },
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
              `${config.endpoint}/v1/projects/${config.project}/pages/${slug}${localeQuery()}`,
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

// PWA: deferred service-worker registration (production only — the SW is a
// build artifact; dev serves no sw.js). Registration after load keeps it
// off the critical path; no clients.claim, control begins next navigation.
if ("serviceWorker" in navigator && runtimeBasename() === config.basename) {
  addEventListener("load", () => {
    void navigator.serviceWorker.register(`${config.basename}/sw.js`).catch(() => {});
  });
}
