// `#stores` is resolved at RUNTIME by the page's import map (and marked
// external by the factory build), so TypeScript needs to be told what it
// is. This file doubles as the typed contract for the site's shared state:
// anything declared here is safe for a component in any framework to bind.
declare module "#stores" {
  import type { WritableAtom } from "nanostores";

  export interface CartItem {
    variant?: string;
    product_id: string;
    name?: string;
    price_cents: number;
    quantity: number;
  }
  export interface Cart {
    items: CartItem[];
    total_cents: number;
  }
  export interface SessionUser {
    email?: string;
    name?: string;
    image?: string;
    isAnonymous?: boolean;
    twoFactorEnabled?: boolean;
  }

  /** undefined = not yet known, null = signed out. */
  export const $session: WritableAtom<SessionUser | null | undefined>;
  export const $cart: WritableAtom<Cart>;
  export const $cartCount: WritableAtom<number>;
  /** Component-lab playground value. */
  export const $counter: WritableAtom<number>;
  /** Catalog price filter — drives the products grid. */
  export const $priceMax: WritableAtom<number>;

  export function refreshSession(): Promise<void>;
  export function refreshCart(): Promise<void>;
}
