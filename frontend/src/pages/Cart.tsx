import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, Card, CardContent } from "hono-aep-ui";
import { checkoutCart, money, removeFromCart, track } from "../store";
import { useCart } from "../cart";
import { useSession } from "../auth";

export function CartPage() {
  const { user } = useSession();
  const { cart, refresh } = useCart();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<{ id: string; status: string; total_cents: number } | null>(null);

  const checkout = async () => {
    setBusy(true);
    void track("checkout_started", { cart_id: cart.id, total_cents: cart.total_cents, currency: cart.currency });
    const r = await checkoutCart();
    setBusy(false);
    if (r.needsAuth) return navigate("/login?next=/cart");
    if (r.redirect) return void (window.location.href = r.redirect); // hosted Stripe Checkout
    setOrder(r.order); // local provider settled instantly → paid order
    refresh();
  };

  if (!user)
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Your cart</h1>
        <p className="mt-2 text-muted-foreground">
          <Link to="/login?next=/cart" className="text-primary underline">Sign in</Link> to start a cart.
        </p>
      </div>
    );

  if (order)
    return (
      <div className="py-16 text-center">
        <div className="text-5xl">✅</div>
        <h1 className="mt-4 text-2xl font-bold">Order {order.status}</h1>
        <p className="mt-2 text-muted-foreground">{money(order.total_cents)} — a confirmation email is on its way.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => navigate("/account")}>Get your source →</Button>
          <Button variant="outline" onClick={() => navigate("/products")}>Keep shopping</Button>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl py-6">
      <h1 className="text-2xl font-bold tracking-tight">Your cart</h1>
      {cart.items.length === 0 ? (
        <p className="mt-4 text-muted-foreground">
          Empty. <Link to="/products" className="text-primary underline">Browse the catalog →</Link>
        </p>
      ) : (
        <>
          <div className="mt-6 space-y-3">
            {cart.items.map((i) => (
              <Card key={i.variant ?? i.product_id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <div className="font-medium">{i.name ?? i.product_id}</div>
                    <div className="text-sm text-muted-foreground">
                      {money(i.price_cents)} × {i.quantity}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">{money(i.price_cents * i.quantity)}</span>
                    <button
                      className="text-sm text-muted-foreground hover:text-destructive"
                      onClick={() => void removeFromCart(i.variant ?? i.product_id)}
                    >
                      Remove
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between border-t pt-6">
            <span className="text-lg">Total</span>
            <span className="text-2xl font-bold">{money(cart.total_cents)}</span>
          </div>
          <Button size="lg" className="mt-4 w-full" disabled={busy} onClick={checkout}>
            {busy ? "…" : "Checkout"}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            The cart total, order, payment, and confirmation email are all the baas — this page just posts intent.
          </p>
        </>
      )}
    </div>
  );
}
