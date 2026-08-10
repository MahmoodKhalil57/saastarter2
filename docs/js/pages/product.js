import { addToCart, money, myWishlist, postReview, product, reviewsFor, toggleWishlist, track } from "../store.js";
import { icon, toast } from "../chrome.js";

const slug = new URLSearchParams(location.search).get("slug");
const detail = document.getElementById("detail");
// Pre-paint skeleton: the view-transition morph target must EXIST at first
// render (content arrives async) — the card's title morphs into this h1,
// then the real data replaces the text under the same name.
const vt = slug ? `view-transition-name:product-${slug}` : "";
if (slug)
  detail.innerHTML = `<div><h1 style="${vt}">${slug.replace(/-/g, " ")}</h1><wa-skeleton effect="sheen" style="inline-size:60%"></wa-skeleton></div>`;
const p = await product(slug);
if (!p) detail.innerHTML = '<p>Not found. <a href="./products.html">Back to catalog</a></p>';
else {
  document.title = `${p.name} — saastarter2 pure`;
  void track("product_viewed", { product_id: p.slug, price_cents: p.price_cents });
  const wished = (await myWishlist()).some((w) => w.product === slug);
  detail.innerHTML = `
    <div class="s2-card s2-center" style="align-self:start">
      <div style="font-size:5rem; padding-block:2rem">🧩</div>
      <p class="s2-quiet s2-small" style="text-transform:uppercase">${p.category ?? ""}</p>
    </div>
    <div class="s2-stack">
      <h1 style="${vt}; margin:0">${p.name}</h1>
      <p class="s2-quiet" style="font-size:1.15rem; margin:0">${p.tagline ?? ""}</p>
      <p style="margin:0">${p.description ?? ""}</p>
      <div class="s2-price" style="font-size:1.75rem">${p.price_cents ? money(p.price_cents) : "Free"}</div>
      <div class="s2-row">
        <button class="s2-btn s2-btn-brand s2-btn-l" type="button" id="add">${icon("shopping-cart")} Add to cart</button>
        <button class="s2-btn s2-btn-outline s2-btn-l s2-hidden" type="button" id="view-cart">View cart ${icon("arrow-right")}</button>
        <button class="s2-btn s2-btn-plain s2-btn-l" type="button" id="wish" aria-label="Toggle wishlist" style="color:${wished ? ">${icon("heart")}</button>
      </div>
    </div>`;
  document.getElementById("add").addEventListener("click", async () => {
    await addToCart(slug);
    document.getElementById("view-cart").classList.remove("s2-hidden");
    void document.querySelector("s2-cart-drawer")?.show(); // the sidebar IS the cart
  });
  document
    .getElementById("view-cart")
    .addEventListener("click", () => void document.querySelector("s2-cart-drawer")?.show());
  document.getElementById("wish").addEventListener("click", async () => {
    const { wished: now } = await toggleWishlist(slug);
    document.getElementById("wish").style.color = now ? "var(--s2-accent)" : "var(--s2-muted)";
  });
}

// reviews — wa-rating both ways: interactive in the form, readonly in rows
async function renderReviews() {
  const rows = await reviewsFor(slug);
  document.getElementById("reviews").innerHTML =
    rows.length === 0
      ? '<p class="s2-quiet">No reviews yet — be the first.</p>'
      : rows
          .map(
            (r) => `<div class="s2-card">
        <div class="s2-row" style="justify-content:space-between">
          <strong>${r.title ?? "Review"}</strong>
          <wa-rating label="Rated ${r.rating} of 5" value="${r.rating}" readonly size="s"></wa-rating>
        </div>
        <p class="s2-quiet s2-small" style="margin-block:0.25rem 0">${r.body ?? ""}</p>
        <small class="s2-quiet">— ${r.author_name ?? "Anonymous"}</small>
      </div>`,
          )
          .join("");
}
document.getElementById("rev-post").addEventListener("click", async () => {
  const response = await postReview({
    product: slug,
    rating: Number(document.getElementById("rev-stars").value) || 5,
    title: document.getElementById("rev-title").value,
    body: document.getElementById("rev-body").value,
    author_name: "Pure shopper",
  });
  if (response.ok) {
    void toast("Review posted ✓");
    void renderReviews();
  } else void toast("Could not post review", false);
});
await renderReviews();
