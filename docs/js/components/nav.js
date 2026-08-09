// <s2-nav> — the navbar Web Awesome doesn't ship (tier 3: from scratch).
// Light DOM so the page cascade styles it (site.css) and its box is
// CSS-reserved, so upgrading never shifts layout. State comes from the
// #stores atoms — subscribe fires immediately with the current value, so
// there is no separate "initial paint" path. Owns theme + locale toggles.
import { getLocale, setLocale } from "../api.js";
import { $cartCount, $session } from "#stores";
import { applyPrefs, icon } from "../chrome.js";

const dark = () => localStorage.getItem("theme") === "dark";

class S2Nav extends HTMLElement {
  #unsubs = [];
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
    this.#unsubs.push($session.subscribe((user) => {
      const link = this.querySelector("#nav-account");
      if (!link) return;
      if (user && !user.isAnonymous) { link.innerHTML = `${icon("user")} Account`; link.href = "./account.html"; }
      else { link.innerHTML = `${icon("log-in")} Sign in`; link.href = "./login.html"; }
    }));
    this.#unsubs.push($cartCount.subscribe((count) => {
      const badge = this.querySelector("#cart-count");
      if (!badge) return;
      badge.textContent = String(count);
      badge.classList.toggle("s2-hidden", count === 0);
    }));
  }
  disconnectedCallback() {
    this.#unsubs.forEach((unsub) => unsub());
    this.#unsubs = [];
  }
}

if (!customElements.get("s2-nav")) customElements.define("s2-nav", S2Nav);
