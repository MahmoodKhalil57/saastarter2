// Base UI (@base-ui-components/react) wrapped as <s2-price-slider>.
//
// This is the COMPOSE case: Base UI ships headless *compound* components —
// `Slider` is a namespace object of parts (Root/Control/Track/Thumb/…),
// not a renderable component — so a mechanical one-shot wrap can't work.
// `webc-factory wrap --compose` generates this scaffold and you assemble
// the parts, which is the honest interface for a headless library: the
// library owns behavior + a11y, you own the markup.
//
// State goes through the site's shared atom, so any other component on the
// page (in any framework) sees the price filter change.
import { useCallback, useSyncExternalStore } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Slider } from "@base-ui-components/react/slider";
import { $priceMax } from "#stores";

function useStore<T>(store: { get: () => T; listen: (cb: () => void) => () => void }): T {
  const subscribe = useCallback((cb: () => void) => store.listen(cb), [store]);
  return useSyncExternalStore(
    subscribe,
    useCallback(() => store.get(), [store]),
  );
}

function PriceSlider({ min = 0, max = 200 }: { min?: number; max?: number }) {
  const value = useStore($priceMax);
  return (
    <Slider.Root value={value} min={min} max={max} step={1} onValueChange={(next) => $priceMax.set(next as number)}>
      <div className="s2-row" style={{ justifyContent: "space-between" }}>
        <span className="s2-quiet s2-small">Max price</span>
        <Slider.Value className="s2-price" />
      </div>
      <Slider.Control className="s2-slider-control">
        <Slider.Track className="s2-slider-track">
          <Slider.Indicator className="s2-slider-indicator" />
          <Slider.Thumb className="s2-slider-thumb" />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}

class S2PriceSlider extends HTMLElement {
  root: Root | null = null;
  connectedCallback() {
    if (this.root) return;
    this.root = createRoot(this);
    this.root.render(
      <PriceSlider min={Number(this.getAttribute("min") ?? 0)} max={Number(this.getAttribute("max") ?? 200)} />,
    );
  }
  disconnectedCallback() {
    this.root?.unmount();
    this.root = null;
  }
}

if (!customElements.get("s2-price-slider")) customElements.define("s2-price-slider", S2PriceSlider);
