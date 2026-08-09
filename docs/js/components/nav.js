// <s2-nav> — the navbar Web Awesome doesn't ship (tier 3: from scratch).
// Light DOM so the page cascade styles it (site.css) and its box is
// CSS-reserved, so upgrading never shifts layout. Listens to the app's
// session-changed / cart-changed events; owns the theme + locale toggles.
import { getLocale, getSession, setLocale } from "../api.js";
import { getCart } from "../store.js";
import { applyPrefs, icon } from "../chrome.js";

const dark = () => localStorage.getItem("theme") === "dark";

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

if (!customElements.get("s2-nav")) customElements.define("s2-nav", S2Nav);
