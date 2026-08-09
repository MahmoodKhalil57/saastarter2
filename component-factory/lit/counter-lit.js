// Authored in Lit. The runtime (~16KB) is bundled into the artifact;
// state comes from the SITE's #stores atom (external in the build), so
// this counter is the same counter as every other engine's.
import { LitElement, html } from "lit";
import { $counter } from "#stores";

class S2CounterLit extends LitElement {
  static properties = { count: { state: true } };

  // Light DOM: the site cascade + wa-button styling apply directly.
  createRenderRoot() { return this; }

  connectedCallback() {
    super.connectedCallback();
    this.unsub = $counter.subscribe((value) => { this.count = value; });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsub?.();
  }
  render() {
    return html`
      <div class="s2-row">
        <wa-button size="s" appearance="outlined" @click=${() => $counter.set(this.count - 1)}>−</wa-button>
        <strong class="s2-price">${this.count}</strong>
        <wa-button size="s" appearance="outlined" @click=${() => $counter.set(this.count + 1)}>+</wa-button>
        <span class="s2-quiet s2-small">lit (compiled artifact)</span>
      </div>`;
  }
}

if (!customElements.get("s2-counter-lit")) customElements.define("s2-counter-lit", S2CounterLit);
