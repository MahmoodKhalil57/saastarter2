import { money, products, searchProducts } from "../store.js";

const grid = document.getElementById("grid");
const EMOJI = { starter: "🛍️", theme: "🎨", plugin: "🔌" };

function render(items) {
  grid.innerHTML = items.length === 0 ? '<p class="text-body-secondary">No matches.</p>' : items.map((p) => `
    <div class="col-sm-6 col-lg-4">
      <a class="card h-100 text-decoration-none" href="./product.html?slug=${encodeURIComponent(p.slug)}">
        <div class="card-body">
          <div class="product-emoji">${EMOJI[p.category] ?? "🧩"}</div>
          <h5 class="card-title d-flex justify-content-between">${p.name}${p.featured ? '<span class="badge text-bg-primary s2-tier-badge">Featured</span>' : ""}</h5>
          <p class="card-text text-body-secondary">${p.tagline ?? ""}</p>
          <span class="s2-price">${p.price_cents ? money(p.price_cents) : "Free"}</span>
        </div>
      </a>
    </div>`).join("");
}

let timer;
document.getElementById("search").addEventListener("input", (event) => {
  clearTimeout(timer);
  const query = event.target.value.trim();
  timer = setTimeout(async () => render(query ? await searchProducts(query) : await products()), 250);
});
render(await products());
