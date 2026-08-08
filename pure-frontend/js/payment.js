// The in-page payment step (gateway.md): our page, the provider's element.
// Keyed by gateway name — a new provider = one more case here.
export function mountPayment({ payment, container, payButton, amountLabel, onPaid, onError }) {
  if (payment.gateway !== "stripe") return onError(`No element adapter for "${payment.gateway}".`);
  const boot = () => {
    const stripe = window.Stripe(payment.client.publishableKey);
    const elements = stripe.elements({ clientSecret: payment.clientToken });
    elements.create("payment").mount(container);
    payButton.disabled = false;
    payButton.textContent = `Pay ${amountLabel}`;
    payButton.onclick = async () => {
      payButton.disabled = true;
      payButton.textContent = "Processing…";
      const result = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: { return_url: location.href },
      });
      if (result.error) {
        payButton.disabled = false;
        payButton.textContent = `Pay ${amountLabel}`;
        return onError(result.error.message ?? "Payment failed.");
      }
      onPaid(); // UX only — the verified webhook settles the order
    };
  };
  if (window.Stripe) return boot();
  const script = document.createElement("script");
  script.src = "https://js.stripe.com/v3";
  script.onload = boot;
  script.onerror = () => onError("stripe.js failed to load");
  document.head.appendChild(script);
}
