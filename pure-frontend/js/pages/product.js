import { addToCart, money, myWishlist, postReview, product, reviewsFor, toggleWishlist, track } from "../store.js";
import { toast } from "../ui.js";
import { openCart } from "../cart-drawer.js";

const slug = new URLSearchParams(location.search).get("slug");
const detail = document.getElementById("detail");
// Pre-paint skeleton: the view-transition morph target must EXIST at first
// render (content arrives async) — the card's title morphs into this h1,
// then the real data replaces the text under the same name.
const vt = slug ? `view-transition-name:product-${slug}` : "";
if (slug) detail.innerHTML = `<div class="col-12"><h1 style="${vt}">${slug.replace(/-/g, " ")}</h1></div>`;
const p = await product(slug);
if (!p) detail.innerHTML = '<p>Not found. <a href="./products.html">Back to catalog</a></p>';
else {
  document.title = `${p.name} — saastarter2 pure`;
  void track("product_viewed", { product_id: p.slug, price_cents: p.price_cents });
  const wished = (await myWishlist()).some((w) => w.product === slug);
  detail.innerHTML = `
    <div class="col-md-5"><div class="card"><div class="card-body text-center py-5"><div style="font-size:5rem">🧩</div><p class="text-uppercase small text-body-secondary">${p.category ?? ""}</p></div></div></div>
    <div class="col-md-7 vstack gap-3">
      <h1 style="${vt}">${p.name}</h1>
      <p class="lead text-body-secondary">${p.tagline ?? ""}</p>
      <p>${p.description ?? ""}</p>
      <div class="fs-3 fw-bold">${p.price_cents ? money(p.price_cents) : "Free"}</div>
      <div class="d-flex gap-2 align-items-center">
        <button id="add" class="btn btn-primary btn-lg"><iconify-icon icon="lucide:shopping-cart" inline></iconify-icon> Add to cart</button>
        <button id="view-cart" class="btn btn-outline-primary btn-lg d-none">View cart <iconify-icon icon="lucide:arrow-right" inline></iconify-icon></button>
        <button id="wish" class="btn btn-link fs-3 p-0" style="color:${wished ? "var(--s2-accent)" : "var(--bs-secondary-color)"}" aria-label="Toggle wishlist"><iconify-icon icon="${wished ? "lucide:heart" : "lucide:heart"}" inline></iconify-icon></button>
      </div>
    </div>`;
  document.getElementById("add").onclick = async () => {
    await addToCart(slug);
    document.getElementById("view-cart").classList.remove("d-none");
    openCart(); // the sidebar IS the cart
  };
  document.getElementById("view-cart").onclick = () => openCart();
  document.getElementById("wish").onclick = async () => {
    const { wished: now } = await toggleWishlist(slug);
    document.getElementById("wish").style.color = now ? "var(--s2-accent)" : "var(--bs-secondary-color)";
  };
}

// reviews
let rating = 5;
const stars = document.getElementById("stars");
const paintStars = () => { stars.innerHTML = [1,2,3,4,5].map((n) => `<span role="button" data-n="${n}" style="color:${n <= rating ? "var(--s2-accent)" : "var(--bs-tertiary-color)"}">★</span>`).join(""); };
stars.addEventListener("click", (event) => { const n = Number(event.target.dataset.n); if (n) { rating = n; paintStars(); } });
paintStars();

async function renderReviews() {
  const rows = await reviewsFor(slug);
  document.getElementById("reviews").innerHTML = rows.length === 0
    ? '<p class="text-body-secondary">No reviews yet — be the first.</p>'
    : rows.map((r) => `<div class="card"><div class="card-body py-2"><div class="d-flex justify-content-between"><strong>${r.title ?? "Review"}</strong><span style="color:var(--s2-accent)">${"★".repeat(r.rating)}</span></div><p class="mb-1 small text-body-secondary">${r.body ?? ""}</p><small class="text-body-tertiary">— ${r.author_name ?? "Anonymous"}</small></div></div>`).join("");
}
document.getElementById("rev-post").onclick = async () => {
  const response = await postReview({ product: slug, rating, title: document.getElementById("rev-title").value, body: document.getElementById("rev-body").value, author_name: "Pure shopper" });
  if (response.ok) { toast("Review posted ✓"); void renderReviews(); }
  else toast("Could not post review", false);
};
await renderReviews();
