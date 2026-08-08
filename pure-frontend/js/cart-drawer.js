// The cart as a SIDEBAR (Bootstrap Offcanvas), mounted by ui.js on every
// page: items → coupon → embedded payment (the gateway's element renders
// INSIDE the drawer) → done. Same store calls as ever; the page never
// changes underneath the shopper.
import { checkoutCart, getCart, money, removeFromCart, validateDiscount, waitForOrder } from "./store.js";
import { mountPayment } from "./payment.js";
import { icon } from "./icons.js";
import { toast } from "./ui.js";

const DRAWER = `
<div class="offcanvas offcanvas-end" tabindex="-1" id="cart-drawer" style="max-width:26rem">
  <div class="offcanvas-header border-bottom">
    <h5 class="offcanvas-title">${icon("shopping-cart")} Your cart</h5>
    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
  </div>
  <div class="offcanvas-body d-flex flex-column">
    <div id="cd-cart-view" class="d-flex flex-column flex-grow-1">
      <div id="cd-items" class="vstack gap-2 mb-3"></div>
      <div class="mt-auto">
        <div class="input-group mb-1">
          <input id="cd-code" class="form-control form-control-sm text-uppercase" placeholder="Discount code (try LAUNCH20)">
          <button id="cd-apply" class="btn btn-sm btn-outline-primary">${icon("tag")} Apply</button>
        </div>
        <p id="cd-coupon-line" class="text-success small d-none mb-1"></p>
        <p id="cd-coupon-error" class="text-danger small d-none mb-1"></p>
        <div class="d-flex justify-content-between border-top pt-2">
          <span>Total</span><strong id="cd-total" class="s2-price fs-5"></strong>
        </div>
        <button id="cd-checkout" class="btn btn-primary w-100 mt-2">${icon("lock")} Checkout</button>
      </div>
    </div>
    <div id="cd-pay-view" class="d-none">
      <button id="cd-back" class="btn btn-link p-0 mb-2 small">← Back to cart (your items are safe)</button>
      <div id="cd-payment-element" class="border rounded p-2 mb-2"></div>
      <button id="cd-pay" class="btn btn-primary w-100" disabled>Loading…</button>
    </div>
    <div id="cd-done-view" class="d-none text-center py-4">
      <iconify-icon icon="lucide:check" class="fs-1 text-success"></iconify-icon>
      <h5 id="cd-done-title" class="mt-2"></h5>
      <p class="text-body-secondary small">Downloads (if any) are on <a href="./account.html">your orders</a>.</p>
    </div>
  </div>
</div>`;

let coupon = null;
let drawer; // bootstrap.Offcanvas

const el = (id) => document.getElementById(id);
const show = (view) => ["cd-cart-view", "cd-pay-view", "cd-done-view"].forEach((id) =>
  el(id).classList.toggle("d-none", id !== view));

async function render() {
  const cart = await getCart();
  const items = el("cd-items");
  if ((cart.items ?? []).length === 0) {
    items.innerHTML = '<p class="text-body-secondary small">Empty. <a href="./products.html">Browse the catalog →</a></p>';
    el("cd-checkout").disabled = true;
  } else {
    items.innerHTML = cart.items.map((item) => `
      <div class="d-flex justify-content-between align-items-center border-bottom pb-2">
        <div><strong class="small">${item.name ?? item.product_id}</strong><br>
          <small class="text-body-secondary">${money(item.price_cents)} × ${item.quantity}</small></div>
        <div class="d-flex gap-2 align-items-center">
          <span class="s2-price small">${money(item.price_cents * item.quantity)}</span>
          <button class="btn btn-sm btn-link text-danger p-0" data-variant="${item.variant ?? item.product_id}" aria-label="Remove">${icon("trash-2")}</button>
        </div>
      </div>`).join("");
    el("cd-checkout").disabled = false;
  }
  el("cd-total").textContent = money(Math.max(0, (cart.total_cents ?? 0) - (coupon?.discount_cents ?? 0)));
}

async function checkout() {
  const { status, body } = await checkoutCart(coupon?.code);
  if (status === 422) return toast(body.title ?? "Checkout rejected", false);
  if (body.payment) {
    show("cd-pay-view");
    mountPayment({
      payment: body.payment,
      container: "#cd-payment-element",
      payButton: el("cd-pay"),
      amountLabel: money(body.order.total_cents),
      onPaid: async () => {
        const settled = await waitForOrder(body.order.id);
        el("cd-done-title").textContent = settled?.status === "delivered" ? "Order delivered" : `Order ${settled?.status ?? "settling"}`;
        show("cd-done-view");
        coupon = null;
        dispatchEvent(new Event("cart-changed"));
      },
      onError: (message) => { toast(message, false); show("cd-cart-view"); },
    });
  } else if (body.order) {
    el("cd-done-title").textContent = `Order ${body.order.status}`;
    show("cd-done-view");
    coupon = null;
    dispatchEvent(new Event("cart-changed"));
  }
}

/** Mounted once by ui.js; safe on every page. */
export function initCartDrawer() {
  document.body.insertAdjacentHTML("beforeend", DRAWER);
  el("cd-items").addEventListener("click", async (event) => {
    const variant = event.target.closest?.("[data-variant]")?.dataset?.variant;
    if (variant) { await removeFromCart(variant); void render(); }
  });
  el("cd-apply").onclick = async () => {
    const code = el("cd-code").value.trim().toUpperCase();
    if (!code) return;
    const verdict = await validateDiscount(code);
    if (verdict.ok) {
      coupon = { code, discount_cents: verdict.discount_cents };
      el("cd-coupon-line").textContent = `${code} ✓ −${money(verdict.discount_cents)}`;
      el("cd-coupon-line").classList.remove("d-none"); el("cd-coupon-error").classList.add("d-none");
    } else {
      coupon = null;
      el("cd-coupon-error").textContent = verdict.reason;
      el("cd-coupon-error").classList.remove("d-none"); el("cd-coupon-line").classList.add("d-none");
    }
    void render();
  };
  el("cd-checkout").onclick = checkout;
  el("cd-back").onclick = () => show("cd-cart-view");
  document.getElementById("cart-drawer").addEventListener("show.bs.offcanvas", () => { show("cd-cart-view"); void render(); });
  addEventListener("cart-changed", render);
  if (location.hash === "#cart") openCart(); // cart.html redirect target
}

export function openCart() {
  const node = document.getElementById("cart-drawer");
  drawer ??= window.bootstrap ? new window.bootstrap.Offcanvas(node) : null;
  if (drawer) drawer.show();
}
