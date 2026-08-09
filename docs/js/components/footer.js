// <s2-footer> — shared footer (tier 3: from scratch, trivially).
class S2Footer extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `static on GitHub Pages · backend on Cloudflare Workers ·
      <a href="./contact.html">contact</a> · <a href="./blog.html">blog</a> ·
      <a href="./admin.html">admin</a>`;
  }
}

if (!customElements.get("s2-footer")) customElements.define("s2-footer", S2Footer);
