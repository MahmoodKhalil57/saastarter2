// The data layer over the live baas — plain fetch, no framework.
import { base, config } from "./config.js";
import { authHeader, ensureSession, localeQuery } from "./api.js";

const commerce = `${base}/commerce`;
const json = { "Content-Type": "application/json" };

export const money = (cents, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

// --- catalog + search + blog + reviews ---
// Short-TTL memory cache: modules persist across SPA navigations
// (js/router.js), so back/forward and repeat visits render in ONE paint
// instead of empty-then-filled. Keys carry the locale.
const CACHE_MS = 30_000;
const cacheStore = new Map();
async function cached(key, load) {
  const hit = cacheStore.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const value = await load();
  cacheStore.set(key, { at: Date.now(), value });
  return value;
}

export async function products() {
  return cached(`products:${localeQuery()}`, async () => {
    const r = await fetch(`${base}/products?order_by=featured desc${localeQuery("&")}`);
    return r.ok ? (await r.json()).results : [];
  });
}
export async function product(slug) {
  return cached(`product:${slug}:${localeQuery()}`, async () => {
    const r = await fetch(`${base}/products/${slug}${localeQuery()}`);
    return r.ok ? r.json() : null;
  });
}
export async function searchProducts(query) {
  const r = await fetch(`${base}/products:search${localeQuery()}`, { method: "POST", headers: json, body: JSON.stringify({ query }) });
  return r.ok ? (await r.json()).results : [];
}
export async function posts() {
  return cached(`posts:${localeQuery()}`, async () => {
    const r = await fetch(`${base}/posts${localeQuery()}`);
    if (!r.ok) return [];
    return (await r.json()).results.filter((p) => p.state !== "DRAFT").sort((a, b) => (a.create_time < b.create_time ? 1 : -1));
  });
}
export async function post(id) {
  const r = await fetch(`${base}/posts/${id}${localeQuery()}`);
  return r.ok ? r.json() : null;
}
export async function reviewsFor(productId) {
  const r = await fetch(`${base}/reviews?filter=${encodeURIComponent(`product=='${productId}'`)}`);
  return r.ok ? (await r.json()).results : [];
}
export async function postReview(review) {
  const header = await ensureSession();
  return fetch(`${base}/reviews`, { method: "POST", headers: { ...json, ...header }, body: JSON.stringify(review) });
}

// --- cart + checkout (guest-by-default; embedded payment) ---
export async function getCart() {
  const header = authHeader();
  if (!header.Authorization) return { items: [], total_cents: 0 };
  const r = await fetch(`${commerce}/cart`, { headers: header });
  return r.ok ? r.json() : { items: [], total_cents: 0 };
}
export async function addToCart(variant, quantity = 1) {
  const header = await ensureSession();
  const r = await fetch(`${commerce}/cart:add`, { method: "POST", headers: { ...json, ...header }, body: JSON.stringify({ variant, quantity }) });
  dispatchEvent(new Event("cart-changed"));
  return r.ok ? r.json() : null;
}
export async function removeFromCart(variant) {
  const r = await fetch(`${commerce}/cart:remove`, { method: "POST", headers: { ...json, ...authHeader() }, body: JSON.stringify({ variant }) });
  dispatchEvent(new Event("cart-changed"));
  return r.ok ? r.json() : null;
}
export async function validateDiscount(code) {
  const r = await fetch(`${commerce}/discount:validate`, { method: "POST", headers: { ...json, ...authHeader() }, body: JSON.stringify({ code }) });
  return r.json();
}
/** Embedded checkout: {order, payment:{gateway, clientToken, client}}. */
export async function checkoutCart(discount) {
  const header = await ensureSession();
  const r = await fetch(`${commerce}/cart:checkout`, {
    method: "POST", headers: { ...json, ...header },
    body: JSON.stringify({ payment: "embedded", ...(discount ? { discount } : {}) }),
  });
  return { status: r.status, body: await r.json() };
}
export async function myOrders() {
  const header = authHeader();
  if (!header.Authorization) return [];
  const r = await fetch(`${commerce}/orders`, { headers: header });
  return r.ok ? (await r.json()).orders : [];
}
export async function waitForOrder(orderId, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const found = (await myOrders()).find((o) => o.id === orderId);
    if (found && found.status !== "pending") return found;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return null;
}

// --- wishlist (owner-private collection) ---
export async function myWishlist() {
  const header = authHeader();
  if (!header.Authorization) return [];
  const r = await fetch(`${base}/wishlist`, { headers: header });
  return r.ok ? (await r.json()).results : [];
}
export async function toggleWishlist(productId) {
  const header = await ensureSession();
  const existing = (await myWishlist()).find((w) => w.product === productId);
  if (existing) {
    await fetch(`${config.endpoint}/v1/${existing.path}`, { method: "DELETE", headers: header });
    return { wished: false };
  }
  await fetch(`${base}/wishlist`, { method: "POST", headers: { ...json, ...header }, body: JSON.stringify({ product: productId }) });
  return { wished: true };
}

// --- billing (subscription + portal) + media + keys ---
export async function subscribe() {
  const header = await ensureSession();
  const r = await fetch(`${base}/billing/checkout`, {
    method: "POST", headers: { ...json, ...header },
    body: JSON.stringify({ product: "pro-monthly", price: "monthly" }),
  });
  return r.ok ? r.json() : {};
}
export async function billingPortal() {
  const r = await fetch(`${base}/billing/portal`, {
    method: "POST", headers: { ...json, ...authHeader() },
    body: JSON.stringify({ returnUrl: location.href }),
  });
  return r.ok ? r.json() : {};
}
export async function proActive() {
  const header = authHeader();
  if (!header.Authorization) return false;
  const r = await fetch(`${base}/flags`, { headers: header });
  if (!r.ok) return false;
  const flags = await r.json();
  return flags["owns-pro"] === true || flags["advanced-export"] === true;
}
export async function uploadMedia(file) {
  const header = await ensureSession();
  const form = new FormData();
  form.append("file", file);
  const r = await fetch(`${base}/media:upload`, { method: "POST", headers: header, body: form });
  if (!r.ok) return null;
  const id = (await r.json()).results[0].path.split("/")[1];
  return `${base}/media/${id}:download`;
}
export async function mintKey() {
  const r = await fetch(`${base}/keys:mint`, { method: "POST", headers: { ...json, ...authHeader() }, body: "{}" });
  return { ok: r.ok, ...(await r.json()) };
}
export async function track(event, properties = {}) {
  fetch(`${commerce}/track`, { method: "POST", headers: { ...json, ...authHeader() }, body: JSON.stringify({ event, properties }) }).catch(() => {});
}
