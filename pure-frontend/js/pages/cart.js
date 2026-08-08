import { checkoutCart, getCart, money, removeFromCart, validateDiscount, waitForOrder } from "../store.js";
import { mountPayment } from "../payment.js";
import { toast } from "../ui.js";

const show = (id) => ["cart-view", "pay-view", "done-view"].forEach((view) =>
  document.getElementById(view).classList.toggle("d-none", view !== id));

let coupon = null;

async function renderCart() {
  const cart = await getCart();
  const items = document.getElementById("items");
  if ((cart.items ?? []).length === 0) {
    items.innerHTML = '<p class="text-body-secondary">Empty. <a href="./products.html">Browse the catalog →</a></p>';
    document.getElementById("checkout").disabled = true;
  } else {
    items.innerHTML = cart.items.map((item) => `
      <div class="card"><div class="card-body py-2 d-flex justify-content-between align-items-center">
        <div><strong>${item.name ?? item.product_id}</strong><br><small class="text-body-secondary">${money(item.price_cents)} × ${item.quantity}</small></div>
        <div class="d-flex gap-3 align-items-center"><span class="s2-price">${money(item.price_cents * item.quantity)}</span>
          <button class="btn btn-sm btn-link text-danger p-0" data-variant="${item.variant ?? item.product_id}" aria-label="Remove"><iconify-icon icon="lucide:trash-2" inline pointer-events="none"></iconify-icon></button></div>
      </div></div>`).join("");
    document.getElementById("checkout").disabled = false;
  }
  const total = Math.max(0, (cart.total_cents ?? 0) - (coupon?.discount_cents ?? 0));
  document.getElementById("total").textContent = money(total);
}
document.getElementById("items").addEventListener("click", async (event) => {
  const variant = event.target.closest?.("[data-variant]")?.dataset?.variant;
  if (variant) { await removeFromCart(variant); void renderCart(); }
});

document.getElementById("apply").onclick = async () => {
  const code = document.getElementById("code").value.trim().toUpperCase();
  if (!code) return;
  const verdict = await validateDiscount(code);
  const line = document.getElementById("coupon-line");
  const error = document.getElementById("coupon-error");
  if (verdict.ok) {
    coupon = { code, discount_cents: verdict.discount_cents };
    line.textContent = `${code} applied ✓ −${money(verdict.discount_cents)}`;
    line.classList.remove("d-none"); error.classList.add("d-none");
  } else {
    coupon = null;
    error.textContent = verdict.reason; error.classList.remove("d-none"); line.classList.add("d-none");
  }
  void renderCart();
};

document.getElementById("checkout").onclick = async () => {
  const { status, body } = await checkoutCart(coupon?.code);
  if (status === 422) return toast(body.title ?? "Checkout rejected", false);
  if (body.payment) {
    show("pay-view");
    mountPayment({
      payment: body.payment,
      container: "#payment-element",
      payButton: document.getElementById("pay"),
      amountLabel: money(body.order.total_cents),
      onPaid: async () => {
        const settled = await waitForOrder(body.order.id);
        document.getElementById("done-title").textContent =
          settled?.status === "delivered" ? "Order delivered" : `Order ${settled?.status ?? "settling"}`;
        show("done-view");
        dispatchEvent(new Event("cart-changed"));
      },
      onError: (message) => { toast(message, false); show("cart-view"); },
    });
  } else if (body.order) {
    document.getElementById("done-title").textContent = `Order ${body.order.status}`;
    show("done-view");
    dispatchEvent(new Event("cart-changed"));
  }
};
document.getElementById("back").onclick = () => show("cart-view");
await renderCart();
