// The site's state, as nanostores atoms — the ONE surface every component
// tier shares. Site modules, hand-written custom elements, factory-built
// .gen.js artifacts, and react-jit components all import THIS file through
// the `#stores` import-map alias (never by relative path, never bundled),
// so there is exactly one instance of each atom per page. nanostores is
// framework-agnostic and ~300 bytes: `$atom.get()`, `$atom.set(v)`,
// `$atom.subscribe(cb)` — every engine can bind to that.
import { atom } from "nanostores";
import { getSession } from "./api.js";
import { getCart } from "./store.js";

/** Current user: undefined = not yet known, null = signed out. */
export const $session = atom(undefined);
/** The live cart, shape straight from the commerce API. */
export const $cart = atom({ items: [], total_cents: 0 });
/** Derived convenience: total item count (nav badge etc.). */
export const $cartCount = atom(0);
$cart.subscribe((cart) => $cartCount.set((cart.items ?? []).reduce((sum, item) => sum + item.quantity, 0)));

/** Playground atom for the component lab (lab.html) — five engines, one value. */
export const $counter = atom(0);

// --- refreshers: mutations in api.js/store.js call these instead of
// dispatching DOM events; components just subscribe to the atoms.
export async function refreshSession() {
  $session.set(await getSession());
}
export async function refreshCart() {
  $cart.set(await getCart());
}
