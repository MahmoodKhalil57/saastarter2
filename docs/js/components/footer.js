// <s2-footer> — the footer is static text, so it lives in each page's HTML
// and renders with no JavaScript at all.
//
// SYNC: the copy below must match the markup inside <s2-footer> in every
// page — change one, change both. Find them with:
//   grep -l "static on GitHub Pages" docs/*.html
// It is only used if the element is created empty (a page that forgot it,
// or a test).
const FALLBACK = `static on GitHub Pages · backend on Cloudflare Workers ·
  <a href="./contact.html">contact</a> · <a href="./blog.html">blog</a> ·
  <a href="./admin.html">admin</a>`;

class S2Footer extends HTMLElement {
  connectedCallback() {
    if (!this.textContent.trim()) this.innerHTML = FALLBACK;
  }
}

if (!customElements.get("s2-footer")) customElements.define("s2-footer", S2Footer);
