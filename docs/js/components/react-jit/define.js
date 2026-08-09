// defineReactComponent(tag, loadFactory) — wrap a react-jit component
// factory in a custom element that honors the pre/post-engine contract:
//
//   PRE-ENGINE  the element's author-provided light-DOM children (a
//               skeleton, static text, anything) stay EXACTLY as parsed,
//               and `engine-state="loading"` is set for CSS hooks. The
//               engine is not guaranteed to load — offline, CDN outage —
//               so the fallback must be honest content, not a spinner
//               that lies forever.
//   POST-ENGINE React mounts into a node it owns, the fallback children
//               are swapped out in one replaceChildren (no flash of
//               empty), `engine-state="ready"`. On engine failure the
//               fallback simply remains and `engine-state="failed"`.
//
// Attributes present at connect time become the component's initial props
// (kebab-case → camelCase). State beyond that flows through #stores atoms,
// same as every other tier.
import { loadEngine } from "./engine.js";

const camel = (name) => name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

export function defineReactComponent(tag, loadFactory) {
  if (customElements.get(tag)) return;
  customElements.define(
    tag,
    class extends HTMLElement {
      #root = null;
      async connectedCallback() {
        this.setAttribute("engine-state", "loading");
        let engine, factory;
        try {
          [engine, factory] = await Promise.all([loadEngine(), loadFactory()]);
        } catch {
          this.setAttribute("engine-state", "failed");
          return; // pre-engine fallback stays — that's the contract
        }
        if (!this.isConnected || this.#root) return;
        const Component = (factory.default ?? factory)(engine);
        const props = Object.fromEntries(
          [...this.attributes].filter((a) => a.name !== "engine-state").map((a) => [camel(a.name), a.value]),
        );
        const mount = document.createElement("div");
        mount.style.display = "contents";
        this.#root = engine.createRoot(mount);
        this.#root.render(engine.React.createElement(Component, props));
        this.replaceChildren(mount);
        this.setAttribute("engine-state", "ready");
      }
      disconnectedCallback() {
        this.#root?.unmount();
        this.#root = null;
      }
    },
  );
}
