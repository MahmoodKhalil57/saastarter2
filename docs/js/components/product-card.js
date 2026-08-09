// <s2-product-card> (tier 3: from scratch, composing wa-card inside) —
// the catalog card. Attributes in: slug, name, tagline, price (display
// string — the caller owns money formatting), category, featured (bool).
// Light DOM on purpose: the card title carries a view-transition-name
// that must match the product page's <h1> across a DOCUMENT navigation,
// and the s2-card-link hover treatment comes from the page cascade.
const EMOJI = { starter: "🛍️", theme: "🎨", plugin: "🔌" };

class S2ProductCard extends HTMLElement {
  connectedCallback() {
    const slug = this.getAttribute("slug") ?? "";
    this.innerHTML = `
    <a class="s2-card-link" href="./product.html?slug=${encodeURIComponent(slug)}">
      <wa-card>
        <div class="product-emoji">${EMOJI[this.getAttribute("category")] ?? "🧩"}</div>
        <div class="s2-row" style="justify-content:space-between">
          <strong style="view-transition-name:product-${CSS.escape(slug)}"></strong>
          ${this.hasAttribute("featured") ? '<wa-badge variant="brand">Featured</wa-badge>' : ""}
        </div>
        <p class="s2-quiet s2-small"></p>
        <span class="s2-price"></span>
      </wa-card>
    </a>`;
    // user-authored fields land as text, never as markup
    this.querySelector("strong").textContent = this.getAttribute("name") ?? slug;
    this.querySelector("p").textContent = this.getAttribute("tagline") ?? "";
    this.querySelector(".s2-price").textContent = this.getAttribute("price") ?? "";
  }
}

if (!customElements.get("s2-product-card")) customElements.define("s2-product-card", S2ProductCard);
