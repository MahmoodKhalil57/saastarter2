// react-jit component FACTORY — plain JS, no JSX (htm's `html` tag is the
// JSX stand-in, so this file runs in the browser untouched). The factory
// receives the lazily-loaded engine; the atom comes from #stores like in
// every other tier, so this counter stays in sync with the lit/svelte/
// vue/compiled-react ones on the same page.
import { $counter } from "#stores";

export default ({ html, useStore }) =>
  function Counter() {
    const count = useStore($counter);
    return html`
      <div class="s2-row">
        <wa-button size="s" appearance="outlined" onClick=${() => $counter.set(count - 1)}>−</wa-button>
        <strong class="s2-price">${count}</strong>
        <wa-button size="s" appearance="outlined" onClick=${() => $counter.set(count + 1)}>+</wa-button>
        <span class="s2-quiet s2-small">react-jit (engine lazy-loaded)</span>
      </div>`;
  };
