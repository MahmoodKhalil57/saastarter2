import { money, products, searchProducts } from "../store.js";

const grid = document.getElementById("grid");
const EMOJI = { starter: "🛍️", theme: "🎨", plugin: "🔌" };

function render(items) {
  grid.innerHTML = items.length === 0 ? '<p class="s2-quiet">No matches.</p>' : items.map((p) => `
    <a class="s2-card-link" href="./product.html?slug=${encodeURIComponent(p.slug)}">
      <wa-card>
        <div class="product-emoji">${EMOJI[p.category] ?? "🧩"}</div>
        <div class="s2-row" style="justify-content:space-between">
          <strong style="view-transition-name:product-${p.slug}">${p.name}</strong>
          ${p.featured ? '<wa-badge variant="brand">Featured</wa-badge>' : ""}
        </div>
        <p class="s2-quiet s2-small">${p.tagline ?? ""}</p>
        <span class="s2-price">${p.price_cents ? money(p.price_cents) : "Free"}</span>
      </wa-card>
    </a>`).join("");
}

let timer;
document.getElementById("search").addEventListener("input", (event) => {
  clearTimeout(timer);
  const query = (event.target.value ?? "").trim();
  timer = setTimeout(async () => render(query ? await searchProducts(query) : await products()), 250);
});
render(await products());
