import { config } from "./config";
import { authHeader } from "./auth";
import { localeQuery } from "./locale";

/** The storefront's data layer over the live baas commerce + collections. */
const base = `${config.endpoint}/v1/projects/${config.project}`;

export const money = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

// ---------------------------------------------------------------------------
// Cart + checkout — the kind:commerce surface (baas/commerce.md). The cart
// math, order snapshot, payment→order bridge, confirmation email, and
// inventory all live server-side; the storefront just posts intent and
// renders the returned views. This is the LoC the spec deletes from the app.
// ---------------------------------------------------------------------------

export type LineItem = { product_id: string; name?: string; variant?: string; price_cents: number; quantity: number };
export type Cart = { id: string; items: LineItem[]; total_cents: number; currency: string; status: string };
export type Order = { id: string; items: LineItem[]; total_cents: number; currency: string; status: string };

const commerce = `${base}/commerce`;

/** A cart mutation happened — the nav badge + Cart page re-read. */
export function notifyCartChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("cart-changed"));
}

export async function getCart(): Promise<Cart> {
  const header = authHeader();
  if (!("Authorization" in header)) return { id: "", items: [], total_cents: 0, currency: "usd", status: "active" };
  const r = await fetch(`${commerce}/cart`, { headers: header });
  return r.ok ? ((await r.json()) as Cart) : { id: "", items: [], total_cents: 0, currency: "usd", status: "active" };
}

export async function addToCart(variant: string, quantity = 1): Promise<Cart | { needsAuth: true }> {
  const header = authHeader();
  if (!("Authorization" in header)) return { needsAuth: true };
  const r = await fetch(`${commerce}/cart:add`, {
    method: "POST", headers: { "Content-Type": "application/json", ...header }, body: JSON.stringify({ variant, quantity }),
  });
  if (r.status === 401) return { needsAuth: true };
  const cart = (await r.json()) as Cart;
  notifyCartChanged();
  return cart;
}

export async function removeFromCart(variant: string): Promise<Cart> {
  const header = authHeader();
  const r = await fetch(`${commerce}/cart:remove`, {
    method: "POST", headers: { "Content-Type": "application/json", ...header }, body: JSON.stringify({ variant }),
  });
  const cart = (await r.json()) as Cart;
  notifyCartChanged();
  return cart;
}

/** Validate a coupon against the live cart (server-computed; emits
 *  coupon_applied/denied). 422 carries the denial reason. */
export async function validateDiscount(code: string): Promise<{ ok: true; discount_cents: number } | { ok: false; reason: string }> {
  const r = await fetch(`${commerce}/discount:validate`, {
    method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify({ code }),
  });
  return (await r.json()) as { ok: true; discount_cents: number } | { ok: false; reason: string };
}

/** Checkout: server snapshots the cart into an order (coupon applied as a
 *  line adjustment) and bridges to billing — stripe returns a hosted
 *  session (redirect), local settles instantly. */
export async function checkoutCart(discount?: string): Promise<{ order: Order; redirect?: string; needsAuth?: boolean; rejected?: string }> {
  const header = authHeader();
  if (!("Authorization" in header)) return { order: { id: "", items: [], total_cents: 0, currency: "usd", status: "" }, needsAuth: true };
  const r = await fetch(`${commerce}/cart:checkout`, {
    method: "POST", headers: { "Content-Type": "application/json", ...header },
    body: JSON.stringify(discount ? { discount } : {}),
  });
  if (r.status === 401) return { order: { id: "", items: [], total_cents: 0, currency: "usd", status: "" }, needsAuth: true };
  if (r.status === 422) {
    const problem = (await r.json()) as { title?: string };
    return { order: { id: "", items: [], total_cents: 0, currency: "usd", status: "" }, rejected: problem.title ?? "Checkout rejected" };
  }
  const body = (await r.json()) as { order: Order; checkout?: { url?: string } };
  return { order: body.order, ...(body.checkout?.url ? { redirect: body.checkout.url } : {}) };
}

/** The signed-in user's orders, newest first (purchase history + ownership). */
export async function myOrders(): Promise<Order[]> {
  const header = authHeader();
  if (!("Authorization" in header)) return [];
  const r = await fetch(`${commerce}/orders`, { headers: header });
  if (!r.ok) return [];
  return ((await r.json()) as { orders: Order[] }).orders;
}

/** Does the user own `slug`? True when a paid order contains that product —
 *  the same fact the baas turns into an `owns:{slug}` entitlement for authz. */
export async function owned(): Promise<Set<string>> {
  const orders = await myOrders();
  const set = new Set<string>();
  for (const o of orders) if (o.status === "paid") for (const i of o.items) set.add(i.product_id);
  return set;
}

// ---------------------------------------------------------------------------
// Media — per-project files (baas media kind): authenticated multipart
// upload, public immutable download URL. Used for avatars here; the same
// two calls carry product shots, post covers, anything.
// ---------------------------------------------------------------------------

export async function uploadMedia(file: File): Promise<{ url: string } | { needsAuth: true } | { error: string }> {
  const header = authHeader();
  if (!("Authorization" in header)) return { needsAuth: true };
  const form = new FormData();
  form.append("file", file);
  const r = await fetch(`${base}/media:upload`, { method: "POST", headers: header, body: form });
  if (r.status === 401) return { needsAuth: true };
  if (!r.ok) return { error: `upload failed (${r.status})` };
  const { results } = (await r.json()) as { results: { path: string }[] };
  const id = results[0]!.path.split("/")[1]!;
  return { url: `${base}/media/${id}:download` };
}

// ---------------------------------------------------------------------------
// Subscriptions — the billing kind's RECURRING path (separate from the
// one-time commerce flow): a month-interval catalog price → hosted
// subscription-mode checkout; the webhook lifecycle (grant → renew on
// invoice.paid → revoke on cancellation) maintains the `pro` entitlement.
// ---------------------------------------------------------------------------

export async function subscribe(): Promise<{ redirect?: string; needsAuth?: boolean }> {
  const header = authHeader();
  if (!("Authorization" in header)) return { needsAuth: true };
  const r = await fetch(`${base}/billing/checkout`, {
    method: "POST", headers: { "Content-Type": "application/json", ...header },
    body: JSON.stringify({ product: "pro-monthly", price: "monthly" }),
  });
  if (r.status === 401) return { needsAuth: true };
  const body = (await r.json()) as { url?: string };
  return body.url ? { redirect: body.url } : {};
}

/** The provider's self-serve portal (manage payment method / cancel) —
 *  available once a verified purchase recorded the customer mapping. */
export async function billingPortal(): Promise<{ url?: string }> {
  const header = authHeader();
  if (!("Authorization" in header)) return {};
  const r = await fetch(`${base}/billing/portal`, {
    method: "POST", headers: { "Content-Type": "application/json", ...header },
    body: JSON.stringify({ returnUrl: `${location.origin}${config.basename}/account?tab=billing` }),
  });
  if (!r.ok) return {};
  return (await r.json()) as { url: string };
}

/** Server-evaluated flags for the signed-in principal (entitlement-gated). */
export async function proActive(): Promise<boolean> {
  const header = authHeader();
  if (!("Authorization" in header)) return false;
  const r = await fetch(`${base}/flags`, { headers: header });
  if (!r.ok) return false;
  const flags = (await r.json()) as Record<string, unknown>;
  return flags["owns-pro"] === true || flags["advanced-export"] === true;
}

// ---------------------------------------------------------------------------
// Reviews — a hosted collection (hono-aep-baas-config/collections/reviews.cms.json).
// A whole "reviews subsystem" is one declarative JSON file: public read,
// authenticated create, owner edit/delete. The app just calls the contract.
// ---------------------------------------------------------------------------

export type Review = { path?: string; product: string; rating: number; title?: string; body?: string; author_name?: string; created_by?: string };

export async function reviewsFor(product: string): Promise<Review[]> {
  const r = await fetch(`${base}/reviews?filter=${encodeURIComponent(`product=='${product}'`)}`);
  if (!r.ok) return [];
  return ((await r.json()) as { results: Review[] }).results;
}

export async function postReview(review: { product: string; rating: number; title?: string; body?: string; author_name?: string }): Promise<Review | { needsAuth: true }> {
  const header = authHeader();
  if (!("Authorization" in header)) return { needsAuth: true };
  const r = await fetch(`${base}/reviews`, {
    method: "POST", headers: { "Content-Type": "application/json", ...header }, body: JSON.stringify(review),
  });
  if (r.status === 401) return { needsAuth: true };
  return (await r.json()) as Review;
}

// ---------------------------------------------------------------------------
// Wishlist — an OWNER-PRIVATE hosted collection (wishlist.cms.json): each
// user lists only their own rows (policy_list owner). Toggle = create/delete.
// ---------------------------------------------------------------------------

export type WishlistItem = { path: string; product: string };

export async function myWishlist(): Promise<WishlistItem[]> {
  const header = authHeader();
  if (!("Authorization" in header)) return [];
  const r = await fetch(`${base}/wishlist`, { headers: header });
  if (!r.ok) return [];
  return ((await r.json()) as { results: WishlistItem[] }).results;
}

export async function toggleWishlist(product: string): Promise<{ wished: boolean } | { needsAuth: true }> {
  const header = authHeader();
  if (!("Authorization" in header)) return { needsAuth: true };
  const items = await myWishlist();
  const existing = items.find((w) => w.product === product);
  if (existing) {
    await fetch(`${config.endpoint}/v1/${existing.path}`, { method: "DELETE", headers: header });
    return { wished: false };
  }
  const r = await fetch(`${base}/wishlist`, {
    method: "POST", headers: { "Content-Type": "application/json", ...header }, body: JSON.stringify({ product }),
  });
  if (r.status === 401) return { needsAuth: true };
  void track("product_added_to_wishlist", { product_id: product });
  return { wished: true };
}

/** Client analytics event (untrusted; order_completed is server-derived). */
export async function track(event: string, properties: Record<string, unknown> = {}): Promise<void> {
  await fetch(`${commerce}/track`, {
    method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify({ event, properties }),
  }).catch(() => {});
}

export type CatalogProduct = { path: string; slug: string; name: string; tagline?: string; description?: string; price_cents?: number; category?: string; featured?: boolean };
export async function products(): Promise<CatalogProduct[]> {
  const r = await fetch(`${base}/products?order_by=featured desc${localeQuery("&")}`);
  if (!r.ok) return [];
  return ((await r.json()) as { results: CatalogProduct[] }).results;
}
/** Hybrid product search (search kind — lexical + semantic RRF, AEP-136 :search). */
export async function searchProducts(query: string): Promise<CatalogProduct[]> {
  const r = await fetch(`${base}/products:search`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }),
  });
  if (!r.ok) return [];
  return ((await r.json()) as { results: CatalogProduct[] }).results;
}

export async function product(slug: string): Promise<CatalogProduct | null> {
  const r = await fetch(`${base}/products/${slug}${localeQuery()}`);
  return r.ok ? ((await r.json()) as CatalogProduct) : null;
}
