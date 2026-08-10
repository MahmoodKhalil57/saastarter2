// <s2-nav> — ENHANCES markup that is already in the page.
//
// SYNC: the navbar markup is written statically into every page's HTML so
// the chrome is painted before any JavaScript runs (tier 1). The copy in
// FALLBACK below must stay identical to it — change one, change both.
// Find every page copy with:  grep -l s2-nav-row docs/*.html
//
// This element therefore does NOT render by default: if the markup is
// already there it only wires behaviour, which is what keeps the pre-JS
// and post-JS layouts identical.
import { getLocale, setLocale } from "../api.js";
import { $cartCount, $session } from "#stores";
import { applyPrefs, icon } from "../chrome.js";

const dark = () => localStorage.getItem("theme") === "dark";

// Only used if a page (or a test) creates <s2-nav> with no children.
const FALLBACK = `
  <div class="container s2-nav-row">
    <a class="s2-brand" href="./">saastarter2<small>pure</small></a>
    <a href="./products">${icon("package")} Products</a>
    <a href="./blog">${icon("file-text")} Blog</a>
    <a href="#cart" id="nav-cart">${icon("shopping-cart")} Cart <span id="cart-count" class="s2-badge s2-hidden"></span></a>
    <a href="./login" id="nav-account">${icon("log-in")} Sign in</a>
    <button id="theme-toggle" aria-label="Toggle dark mode"><iconify-icon class="s2-when-light" icon="lucide:moon" inline></iconify-icon><iconify-icon class="s2-when-dark" icon="lucide:sun" inline></iconify-icon></button>
    <button id="locale-toggle" aria-label="Switch language">${icon("languages")} <span class="s2-mono">ع</span></button>
  </div>`;

class S2Nav extends HTMLElement {
  #unsubs = [];
  connectedCallback() {
    if (!this.querySelector(".s2-nav-row")) this.innerHTML = FALLBACK;

    this.querySelector("#theme-toggle")?.addEventListener("click", () => {
      localStorage.setItem("theme", dark() ? "light" : "dark");
      applyPrefs(); // the icon itself is CSS-driven off .dark — nothing to redraw
    });
    this.querySelector("#locale-toggle")?.addEventListener("click", () =>
      setLocale(getLocale() === "en" ? "ar" : "en"),
    );
    this.querySelector("#nav-cart")?.addEventListener("click", (event) => {
      event.preventDefault();
      document.querySelector("s2-cart-drawer")?.show();
    });

    // The static markup already says "Sign in" and hides the badge, which
    // is the correct pre-session state; these only correct it afterwards.
    this.#unsubs.push(
      $session.subscribe((user) => {
        const link = this.querySelector("#nav-account");
        if (!link || user === undefined) return;
        const signedIn = user && !user.isAnonymous;
        link.innerHTML = `${icon(signedIn ? "user" : "log-in")} ${signedIn ? "Account" : "Sign in"}`;
        link.href = signedIn ? "./account" : "./login";
      }),
    );
    this.#unsubs.push(
      $cartCount.subscribe((count) => {
        const badge = this.querySelector("#cart-count");
        if (!badge) return;
        badge.textContent = String(count);
        badge.classList.toggle("s2-hidden", count === 0);
      }),
    );
  }
  disconnectedCallback() {
    this.#unsubs.forEach((unsub) => unsub());
    this.#unsubs = [];
  }
}

if (!customElements.get("s2-nav")) customElements.define("s2-nav", S2Nav);
