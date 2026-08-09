import { money, products, searchProducts } from "../store.js";
import "../components/product-card.js";
import "../components/search.js";

const grid = document.getElementById("grid");

function render(items) {
  if (items.length === 0) {
    grid.innerHTML = '<p class="s2-quiet">No matches.</p>';
    return;
  }
  grid.replaceChildren(...items.map((p) => {
    const card = document.createElement("s2-product-card");
    card.setAttribute("slug", p.slug);
    card.setAttribute("name", p.name ?? p.slug);
    card.setAttribute("tagline", p.tagline ?? "");
    card.setAttribute("price", p.price_cents ? money(p.price_cents) : "Free");
    if (p.category) card.setAttribute("category", p.category);
    if (p.featured) card.setAttribute("featured", "");
    return card;
  }));
}

document.getElementById("search").addEventListener("s2-search", async (event) => {
  const query = event.detail.query;
  render(query ? await searchProducts(query) : await products());
});
render(await products());
