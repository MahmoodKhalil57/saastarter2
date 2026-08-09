// Authored in real JSX — this is the tier where React's native syntax is
// allowed, because the factory compiles it once. The React runtime is
// bundled into the artifact (heavy — see react-jit/ for the shared-engine
// alternative); the atom is the site's own via #stores (external).
import { useCallback, useSyncExternalStore } from "react";
import { createRoot, type Root } from "react-dom/client";
import { $counter } from "#stores";

function useStore<T>(store: { get: () => T; listen: (cb: () => void) => () => void }): T {
  const subscribe = useCallback((cb: () => void) => store.listen(cb), [store]);
  const getSnapshot = useCallback(() => store.get(), [store]);
  return useSyncExternalStore(subscribe, getSnapshot);
}

function Counter() {
  const count = useStore($counter);
  return (
    <div className="s2-row">
      <wa-button size="s" appearance="outlined" onClick={() => $counter.set(count - 1)}>
        −
      </wa-button>
      <strong className="s2-price">{count}</strong>
      <wa-button size="s" appearance="outlined" onClick={() => $counter.set(count + 1)}>
        +
      </wa-button>
      <span className="s2-quiet s2-small">react (compiled artifact)</span>
    </div>
  );
}

class S2CounterReact extends HTMLElement {
  root: Root | null = null;
  connectedCallback() {
    if (this.root) return;
    this.root = createRoot(this);
    this.root.render(<Counter />);
  }
  disconnectedCallback() {
    this.root?.unmount();
    this.root = null;
  }
}

if (!customElements.get("s2-counter-react")) customElements.define("s2-counter-react", S2CounterReact);

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "wa-button": any;
    }
  }
}
