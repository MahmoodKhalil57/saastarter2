// App glue, imported once per page: registers the shared-chrome components
// (js/components/ — the platform's answer to "HTML has no include"),
// applies theme/locale prefs, and hosts the tiny cross-cutting utilities
// (icon, toast). There is no router — every link is a real MPA navigation
// smoothed by cross-document View Transitions (site.css) and made instant
// by speculation-rules prerendering (each page's head).
import { consumeAuthFragment, getLocale } from "./api.js";
import { refreshCart, refreshSession } from "#stores";
import "./components/nav.js";
import "./components/footer.js";
import "./components/cart-drawer.js";

export function icon(name, cls = "") {
  const full = name.includes(":") ? name : `lucide:${name}`;
  return `<iconify-icon icon="${full}" class="${cls}" inline></iconify-icon>`;
}

/** wa-toast wants a persistent stack element; one per page, on demand. */
export async function toast(message, ok = true) {
  let stack = document.querySelector("wa-toast");
  if (!stack) {
    stack = document.createElement("wa-toast");
    document.body.append(stack);
  }
  await customElements.whenDefined("wa-toast");
  void stack.create(message, { variant: ok ? "success" : "danger", duration: 4000 });
}

// --- prefs: the inline boot script painted them pre-render; this re-applies
// after a toggle (s2-nav calls it), and on pageshow (a page prerendered
// before a toggle would otherwise activate with the stale theme).
export function applyPrefs() {
  const dark = localStorage.getItem("theme") === "dark";
  const classes = document.documentElement.classList;
  classes.toggle("wa-dark", dark); // Web Awesome's dark scope
  classes.toggle("dark", dark); // the hosted theme's dark scope
  const locale = getLocale();
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}
addEventListener("pageshow", applyPrefs);

// One cart drawer per page, whether or not the page declared one.
if (!document.querySelector("s2-cart-drawer")) {
  document.body.append(document.createElement("s2-cart-drawer"));
}
const maybeOpenCart = () => {
  if (location.hash === "#cart") document.querySelector("s2-cart-drawer")?.show();
};
addEventListener("hashchange", maybeOpenCart);
maybeOpenCart();

consumeAuthFragment();
void refreshSession();
void refreshCart();

// devgit (edit-the-site-from-the-site, dev.html): visitors never load it —
// the import only happens in a browser where a developer saved a token.
if (localStorage.getItem("s2:devgit")) void import("./devgit.js");
if ("serviceWorker" in navigator && location.protocol === "https:") {
  addEventListener("load", () => void navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
