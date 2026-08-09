// Shared chrome as CUSTOM ELEMENTS — the platform's answer to "HTML has no
// include". Pages write <s2-nav></s2-nav> / <s2-footer></s2-footer> and the
// elements render themselves (light DOM, so the global cascade applies).
// Their boxes are reserved in site.css, so upgrading never shifts layout.
// Import once per page; there is no router — every link is a real MPA
// navigation smoothed by cross-document View Transitions (site.css) and
// made instant by speculation-rules prerendering (each page's head).
import { consumeAuthFragment, getLocale, getSession, setLocale } from "./api.js";
import { getCart } from "./store.js";
import "./cart.js"; // defines <s2-cart-drawer>

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

// --- prefs: the inline boot script painted them pre-render; these helpers
// re-apply after a toggle, and on pageshow (a page prerendered before a
// toggle would otherwise activate with the stale theme).
const dark = () => localStorage.getItem("theme") === "dark";
function applyPrefs() {
  const classes = document.documentElement.classList;
  classes.toggle("wa-dark", dark()); // Web Awesome's dark scope
  classes.toggle("dark", dark());    // the hosted theme's dark scope
  const locale = getLocale();
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}
addEventListener("pageshow", applyPrefs);

class S2Nav extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
    <div class="container s2-nav-row">
      <a class="s2-brand" href="./index.html">saastarter2<small>pure</small></a>
      <a href="./products.html">${icon("package")} Products</a>
      <a href="./blog.html">${icon("file-text")} Blog</a>
      <a href="#cart" id="nav-cart">${icon("shopping-cart")} Cart <span id="cart-count" class="s2-badge s2-hidden"></span></a>
      <a href="./login.html" id="nav-account">${icon("log-in")} Sign in</a>
      <button id="theme-toggle" aria-label="Toggle dark mode">${icon(dark() ? "sun" : "moon")}</button>
      <button id="locale-toggle" aria-label="Switch language">${icon("languages")} <span class="s2-mono">ع</span></button>
    </div>`;
    this.querySelector("#theme-toggle").addEventListener("click", () => {
      localStorage.setItem("theme", dark() ? "light" : "dark");
      applyPrefs();
      this.querySelector("#theme-toggle").innerHTML = icon(dark() ? "sun" : "moon");
    });
    this.querySelector("#locale-toggle").addEventListener("click", () => setLocale(getLocale() === "en" ? "ar" : "en"));
    this.querySelector("#nav-cart").addEventListener("click", (event) => {
      event.preventDefault();
      document.querySelector("s2-cart-drawer")?.show();
    });
    addEventListener("session-changed", () => void this.refreshAccount());
    addEventListener("cart-changed", () => void this.refreshBadge());
    void this.refreshAccount();
    void this.refreshBadge();
  }
  async refreshAccount() {
    const link = this.querySelector("#nav-account");
    const user = await getSession();
    if (!link) return;
    if (user && !user.isAnonymous) { link.innerHTML = `${icon("user")} Account`; link.href = "./account.html"; }
    else { link.innerHTML = `${icon("log-in")} Sign in`; link.href = "./login.html"; }
  }
  async refreshBadge() {
    const badge = this.querySelector("#cart-count");
    if (!badge) return;
    const cart = await getCart();
    const count = (cart.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = String(count);
    badge.classList.toggle("s2-hidden", count === 0);
  }
}

class S2Footer extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `static on GitHub Pages · backend on Cloudflare Workers ·
      <a href="./contact.html">contact</a> · <a href="./blog.html">blog</a> ·
      <a href="./admin.html">admin</a>`;
  }
}

customElements.define("s2-nav", S2Nav);
customElements.define("s2-footer", S2Footer);

// One cart drawer per page, whether or not the page declared one.
if (!document.querySelector("s2-cart-drawer")) {
  document.body.append(document.createElement("s2-cart-drawer"));
}
const maybeOpenCart = () => { if (location.hash === "#cart") document.querySelector("s2-cart-drawer")?.show(); };
addEventListener("hashchange", maybeOpenCart);
maybeOpenCart();

consumeAuthFragment();

// devgit (edit-the-site-from-the-site, dev.html): visitors never load it —
// the import only happens in a browser where a developer saved a token.
if (localStorage.getItem("s2:devgit")) void import("./devgit.js");
if ("serviceWorker" in navigator && location.protocol === "https:") {
  addEventListener("load", () => void navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
