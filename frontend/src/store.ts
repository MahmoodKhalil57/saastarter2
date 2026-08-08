import { config } from "./config";
import { authHeader } from "./auth";

/** The storefront's data layer over the live baas billing kind. */
const base = `${config.endpoint}/v1/projects/${config.project}`;

export type Price = { amountCents: number; currency: string; interval?: string };
export type Product = { name: string; grants: string[]; prices: Record<string, Price> };
export type Catalog = { products: Record<string, Product> };

export const money = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

export async function catalog(): Promise<Catalog> {
  const r = await fetch(`${base}/billing/checkout`);
  return r.ok ? ((await r.json()) as Catalog) : { products: {} };
}

/** Buy: POST checkout → for stripe the baas returns a hosted URL to redirect
 *  to; for local it grants directly. Requires a signed-in end user. */
export async function buy(product: string): Promise<{ redirect?: string; owned?: boolean; needsAuth?: boolean }> {
  const header = authHeader();
  if (!("Authorization" in header)) return { needsAuth: true };
  const r = await fetch(`${base}/billing/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...header },
    body: JSON.stringify({ product, price: "once" }),
  });
  if (r.status === 401) return { needsAuth: true };
  const body = (await r.json()) as { url?: string; granted?: string[] };
  if (body.url) return { redirect: body.url };
  return { owned: (body.granted ?? []).length > 0 };
}

/** The signed-in user's entitlements (server-evaluated flags carry them). */
export async function entitlements(): Promise<string[]> {
  const header = authHeader();
  if (!("Authorization" in header)) return [];
  // The flags endpoint resolves per-principal; we expose a dedicated
  // "owns-pro"/"owns-lifetime" flag pair for the UI.
  const r = await fetch(`${base}/flags`, { headers: header });
  if (!r.ok) return [];
  const flags = (await r.json()) as Record<string, unknown>;
  const owned: string[] = [];
  if (flags["owns-pro"]) owned.push("pro");
  if (flags["owns-lifetime"]) owned.push("lifetime");
  return owned;
}
