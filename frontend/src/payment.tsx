import { useEffect, useRef, useState } from "react";
import { Button } from "hono-aep-ui";

/**
 * The in-page payment step (gateway.md §1): OUR page owns the layout;
 * the provider's element owns only the card fields. Keyed by the
 * `gateway` name the baas returns — adding a provider later means one
 * more case here (and nothing else in this app).
 */
export type PaymentHandle = { gateway: string; clientToken: string; client: { publishableKey?: string } };

declare global {
  interface Window {
    Stripe?: (key: string) => StripeJs;
  }
}
type StripeJs = {
  elements(options: { clientSecret: string; appearance?: unknown }): StripeElements;
  confirmPayment(options: { elements: StripeElements; redirect: "if_required" }): Promise<{
    error?: { message?: string };
    paymentIntent?: { status: string };
  }>;
};
type StripeElements = { create(kind: string): { mount(selector: string): void } };

const loadStripeJs = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.Stripe) return resolve();
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("stripe.js failed to load"));
    document.head.appendChild(script);
  });

export function PaymentStep({
  payment,
  amountLabel,
  onPaid,
  onError,
}: {
  payment: PaymentHandle;
  amountLabel: string;
  /** Called after in-page confirmation succeeds (webhook settles the order). */
  onPaid: () => void;
  onError: (message: string) => void;
}) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const stripeRef = useRef<StripeJs | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (payment.gateway !== "stripe") {
      onError(`The "${payment.gateway}" gateway has no element adapter in this storefront yet.`);
      return;
    }
    void loadStripeJs()
      .then(() => {
        if (cancelled) return;
        const stripe = window.Stripe!(payment.client.publishableKey!);
        const elements = stripe.elements({ clientSecret: payment.clientToken });
        elements.create("payment").mount("#payment-element");
        stripeRef.current = stripe;
        elementsRef.current = elements;
        setReady(true);
      })
      .catch((problem) => onError(String(problem)));
    return () => {
      cancelled = true;
    };
  }, [payment.clientToken]);

  const pay = async () => {
    if (!stripeRef.current || !elementsRef.current) return;
    setBusy(true);
    const result = await stripeRef.current.confirmPayment({ elements: elementsRef.current, redirect: "if_required" });
    setBusy(false);
    if (result.error) return onError(result.error.message ?? "Payment failed.");
    onPaid(); // UX only — the ORDER flips on the verified webhook (gateway.md §2.3)
  };

  return (
    <div className="space-y-4">
      <div id="payment-element" className="rounded-md border p-3" />
      <Button size="lg" className="w-full" disabled={!ready || busy} onClick={pay}>
        {busy ? "Processing…" : `Pay ${amountLabel}`}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Card fields are the provider's element inside our page — this site never sees your card.
      </p>
    </div>
  );
}
