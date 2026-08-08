import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, Card, CardContent } from "hono-aep-ui";
import { checkoutCart, money, removeFromCart, track, validateDiscount } from "../store";
import { useCart } from "../cart";
import { useSession } from "../auth";

export function CartPage() {
  const { user } = useSession();
  const { cart, refresh } = useCart();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<{ id: string; status: string; total_cents: number } | null>(null);
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount_cents: number } | null>(null);
  const [couponError, setCouponError] = useState("");

  const applyCode = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    const v = await validateDiscount(trimmed); // server-computed off the live cart
    if (v.ok) { setCoupon({ code: trimmed, discount_cents: v.discount_cents }); setCouponError(""); }
    else { setCoupon(null); setCouponError(v.reason); }
  };

  const checkout = async () => {
    setBusy(true);
    void track("checkout_started", { cart_id: cart.id, total_cents: cart.total_cents, currency: cart.currency, ...(coupon ? { coupon: coupon.code } : {}) });
    const r = await checkoutCart(coupon?.code);
    setBusy(false);
    if (r.needsAuth) return navigate("/login?next=/cart");
    if (r.rejected) return setCouponError(r.rejected);
    if (r.redirect) return void (window.location.href = r.redirect); // hosted Stripe Checkout
    setOrder(r.order); // local provider settled instantly → paid order
    refresh();
  };

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
          <div className="mt-6 flex gap-2">
            <input
              value={code}
              onChange={(e) => { setCode(e.target.value); setCouponError(""); }}
              placeholder="Discount code (try LAUNCH20)"
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm uppercase"
              aria-label="Discount code"
            />
            <Button variant="outline" onClick={applyCode}>Apply</Button>
          </div>
          {couponError && <p className="mt-1 text-sm text-destructive">{couponError}</p>}
          {coupon && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-primary">{coupon.code} applied ✓</span>
              <span className="text-primary">−{money(coupon.discount_cents)}</span>
            </div>
          )}
          <div className="mt-6 flex items-center justify-between border-t pt-6">
            <span className="text-lg">Total</span>
            <span className="text-2xl font-bold">{money(Math.max(0, cart.total_cents - (coupon?.discount_cents ?? 0)))}</span>
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
