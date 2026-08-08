import { useEffect, useState } from "react";
import { getCart, type Cart } from "./store";
import { useSession } from "./auth";

const empty: Cart = { id: "", items: [], total_cents: 0, currency: "usd", status: "active" };

/** Live cart, re-read on sign-in and on every `cart-changed` event. */
export function useCart(): { cart: Cart; refresh: () => void } {
  const { user } = useSession();
  const [cart, setCart] = useState<Cart>(empty);
  const refresh = () => void getCart().then(setCart);
  useEffect(() => {
    refresh();
    const on = () => refresh();
    window.addEventListener("cart-changed", on);
    return () => window.removeEventListener("cart-changed", on);
  }, [user]);
  return { cart, refresh };
}

export const cartCount = (cart: Cart): number => cart.items.reduce((n, i) => n + i.quantity, 0);
