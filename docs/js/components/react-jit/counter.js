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
        <button class="s2-btn s2-btn-quiet s2-btn-s" type="button">$counter.set(count - 1)}>−</button>
        <strong class="s2-price">${count}</strong>
        <button class="s2-btn s2-btn-quiet s2-btn-s" type="button">$counter.set(count + 1)}>+</button>
        <span class="s2-quiet s2-small">react-jit (engine lazy-loaded)</span>
      </div>
    `;
  };
