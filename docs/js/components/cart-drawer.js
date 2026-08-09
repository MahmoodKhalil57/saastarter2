// <s2-cart-drawer> (tier 1: compose) — the cart as a SIDEBAR wrapping a
// Web Awesome drawer,
// mounted on every page by chrome.js: items → coupon → embedded payment
// (the gateway's element renders INSIDE the drawer) → done. The page never
// changes underneath the shopper; `end` placement flips for RTL by itself.
import { checkoutCart, getCart, money, removeFromCart, validateDiscount, waitForOrder } from "../store.js";
import { mountPayment } from "../payment.js";
import { icon, toast } from "../chrome.js";

class S2CartDrawer extends HTMLElement {
  connectedCallback() {
    this.coupon = null;
    this.innerHTML = `
    <wa-drawer label="Your cart" style="--size:26rem">
      <div data-view="cart" class="s2-stack">
        <div id="cd-items" class="s2-stack"></div>
        <div class="s2-row">
          <wa-input id="cd-code" size="s" placeholder="Discount code (try LAUNCH20)" style="flex:1; text-transform:uppercase"></wa-input>
          <wa-button id="cd-apply" size="s" appearance="outlined" variant="brand">${icon("tag")} Apply</wa-button>
        </div>
        <p id="cd-coupon-line" class="s2-small s2-hidden" style="color:var(--wa-color-success-fill-loud)"></p>
        <p id="cd-coupon-error" class="s2-small s2-hidden" style="color:var(--wa-color-danger-fill-loud)"></p>
        <div class="s2-row" style="justify-content:space-between; border-block-start:1px solid var(--s2-line); padding-block-start:0.5rem">
          <span>Total</span><strong id="cd-total" class="s2-price" style="font-size:1.25rem"></strong>
        </div>
        <wa-button id="cd-checkout" variant="brand">${icon("lock")} Checkout</wa-button>
      </div>
      <div data-view="pay" class="s2-stack s2-hidden">
        <wa-button id="cd-back" appearance="plain" size="s">← Back to cart (your items are safe)</wa-button>
        <div id="cd-payment-element" style="border:1px solid var(--s2-line); border-radius:var(--wa-border-radius-m); padding:0.5rem"></div>
        <wa-button id="cd-pay" variant="brand" disabled>Loading…</wa-button>
      </div>
      <div data-view="done" class="s2-center s2-hidden" style="padding-block:2rem">
        <iconify-icon icon="lucide:check" style="font-size:2.5rem; color:var(--wa-color-success-fill-loud)"></iconify-icon>
        <h3 id="cd-done-title"></h3>
        <p class="s2-quiet s2-small">Downloads (if any) are on <a href="./account.html">your orders</a>.</p>
      </div>
    </wa-drawer>`;

    this.el("cd-items").addEventListener("click", async (event) => {
      const variant = event.target.closest?.("[data-variant]")?.dataset?.variant;
      if (variant) { await removeFromCart(variant); void this.render(); }
    });
    this.el("cd-apply").addEventListener("click", () => void this.applyCoupon());
    this.el("cd-checkout").addEventListener("click", () => void this.checkout());
    this.el("cd-back").addEventListener("click", () => this.view("cart"));
    addEventListener("cart-changed", () => void this.render());
  }

  el(id) { return this.querySelector(`#${id}`); }
  view(name) {
    for (const box of this.querySelectorAll("[data-view]")) {
      box.classList.toggle("s2-hidden", box.dataset.view !== name);
    }
  }

  async show() {
    await customElements.whenDefined("wa-drawer");
    this.view("cart");
    void this.render();
    this.querySelector("wa-drawer").open = true;
  }

  async render() {
    const cart = await getCart();
    const items = this.el("cd-items");
    if ((cart.items ?? []).length === 0) {
      items.innerHTML = '<p class="s2-quiet s2-small">Empty. <a href="./products.html">Browse the catalog →</a></p>';
      this.el("cd-checkout").disabled = true;
    } else {
      items.innerHTML = cart.items.map((item) => `
        <div class="s2-row" style="justify-content:space-between; border-block-end:1px solid var(--s2-line); padding-block-end:0.5rem">
          <div><strong class="s2-small">${item.name ?? item.product_id}</strong><br>
            <small class="s2-quiet">${money(item.price_cents)} × ${item.quantity}</small></div>
          <div class="s2-row">
            <span class="s2-price s2-small">${money(item.price_cents * item.quantity)}</span>
            <wa-button size="s" appearance="plain" variant="danger" data-variant="${item.variant ?? item.product_id}" aria-label="Remove">${icon("trash-2")}</wa-button>
          </div>
        </div>`).join("");
      this.el("cd-checkout").disabled = false;
    }
    this.el("cd-total").textContent = money(Math.max(0, (cart.total_cents ?? 0) - (this.coupon?.discount_cents ?? 0)));
  }

  async applyCoupon() {
    const code = (this.el("cd-code").value ?? "").trim().toUpperCase();
    if (!code) return;
    const verdict = await validateDiscount(code);
    const line = this.el("cd-coupon-line"), error = this.el("cd-coupon-error");
    if (verdict.ok) {
      this.coupon = { code, discount_cents: verdict.discount_cents };
      line.textContent = `${code} ✓ −${money(verdict.discount_cents)}`;
      line.classList.remove("s2-hidden"); error.classList.add("s2-hidden");
    } else {
      this.coupon = null;
      error.textContent = verdict.reason;
      error.classList.remove("s2-hidden"); line.classList.add("s2-hidden");
    }
    void this.render();
  }

  async checkout() {
    const { status, body } = await checkoutCart(this.coupon?.code);
    if (status === 422) return toast(body.title ?? "Checkout rejected", false);
    const finish = async (title) => {
      this.el("cd-done-title").textContent = title;
      this.view("done");
      this.coupon = null;
      dispatchEvent(new Event("cart-changed"));
    };
    if (body.payment) {
      this.view("pay");
      mountPayment({
        payment: body.payment,
        container: "#cd-payment-element",
        payButton: this.el("cd-pay"),
        amountLabel: money(body.order.total_cents),
        onPaid: async () => {
          const settled = await waitForOrder(body.order.id);
          void finish(settled?.status === "delivered" ? "Order delivered" : `Order ${settled?.status ?? "settling"}`);
        },
        onError: (message) => { void toast(message, false); this.view("cart"); },
      });
    } else if (body.order) {
      void finish(`Order ${body.order.status}`);
    }
  }
}

if (!customElements.get("s2-cart-drawer")) customElements.define("s2-cart-drawer", S2CartDrawer);
