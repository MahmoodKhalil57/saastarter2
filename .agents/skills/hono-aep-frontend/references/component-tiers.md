# Component tiers — mechanics and trade-offs

Six ways to put a component on the page. None is preferred; each has a
cost you can look up. Pick the cheapest one that does the job.

## 1. Plain HTML + CSS

No mechanism at all. Most UI is this. Reach for a component when you need
**behavior** (focus management, keyboard interaction, state) or
**reuse across pages** — not because a `<div>` feels informal.

## 2. A Web Awesome tag

Already pinned as `wa/` and already themed. `wa-drawer`, `wa-dialog`,
`wa-tab-group`, `wa-select`, `wa-rating`, `wa-otp-input`, `wa-qr-code`,
`wa-markdown`, `wa-toast`, `wa-skeleton`, `wa-copy-button`, and ~50 more.

Two gotchas:
- Components are lazy-registered. Guard against flash-of-undefined with
  `:not(:defined) { visibility: hidden }` for anything whose collapsed
  size would shift layout.
- Attribute values follow the library's vocabulary — e.g. sizes are
  `s`/`m`/`l`, and the long forms are deprecated.

## 3. Your own custom element

One self-registering ESM file per tag:

```js
class MyThing extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `…`;               // light DOM: page cascade applies
    this.unsub = $someAtom.subscribe((v) => this.render(v));
  }
  disconnectedCallback() { this.unsub?.(); }
}
if (!customElements.get("my-thing")) customElements.define("my-thing", MyThing);
```

Conventions that matter:
- **Guard the define** — double imports must be harmless.
- **Light DOM by default.** Shadow DOM hides your content from the page
  cascade and from `view-transition-name` matching across navigations.
  Use it when internal structure must be inviolable, not by reflex.
- **Attributes in, `CustomEvent`s out.** Never a callback property; that
  is a framework habit that does not survive plain HTML.
- **Reserve the box in CSS** if the element renders after first paint, or
  you introduce layout shift.

## 4. Subclass a library component

Library classes are real ESM exports:

```js
import WaInput from "wa/components/input/input.js";
class MySearch extends WaInput { /* add behavior */ }
```

You inherit the shadow template, form association, and theming, and add
only what is missing. Cheapest way to get "almost right" to "right".

## 5. A compiled artifact (`webc-factory`)

Author in React/Vue/Svelte/Lit; compile once into a self-registering
`.gen.js`. The site never gains a build step — the build lives in
`component-factory/` and its output is committed.

```bash
cd component-factory && bun run build
```

`webc.config.json` entries infer the engine from the extension. Vue
entries need an explicit `tag` (that is the engine where the builder
generates registration; Svelte declares its own, Lit and React call
`customElements.define` themselves).

**Weight, measured:** lit ~15KB · svelte ~51KB · vue ~69KB · react ~182KB,
minified, per artifact. Each artifact carries its own runtime, so N React
artifacts is N copies of React. The build prints sizes every run.

**`external` is the setting that matters.** Anything holding shared state
(`#stores`, `nanostores`) must be listed there so it resolves at runtime
through the page import map. Bundling it forks the state silently.

### Wrapping a component you didn't write

```bash
bun add some-package
bunx webc-factory wrap react some-package --tag x-thing --build
```

Attributes become props (kebab → camel, JSON-parsed when parseable);
rich values (functions, instances) go through the element's `props`
property.

**Headless / compound libraries** (Base UI, Radix, Ark) export a
*namespace of parts* — `Root`, `Track`, `Thumb` — not one component.
`wrap` detects this and emits a **compose scaffold** instead: the library
owns behavior, state and accessibility; the markup and CSS are yours.
That division is the deal with headless libraries, not a limitation of
the tool. Expect ~38KB over the bare runtime, and expect to write the
styling — a headless component ships no looks at all.

## 6. react-jit

React with no build: one shared engine (react + react-dom + htm) fetched
on first use and reused by every jit component on the page. Pages that
use none pay nothing. Community React packages can be imported inside a
factory straight from a CDN.

The cost is the **pre/post-engine contract**, which is not optional:

| `engine-state` | what the user sees |
| --- | --- |
| `loading` | your light-DOM children, untouched — write honest fallback content, never an infinite spinner |
| `ready` | the mounted React tree |
| `failed` | the fallback, permanently — degradation, not breakage |

The engine is not guaranteed to load. Offline, blocked CDN, hostile
network — the fallback is what those users get, so it should be worth
looking at.

## Rules that apply to every tier

- Theme through custom properties (`--wa-*`, `--s2-*`); never hardcode a
  color. Custom properties pierce shadow roots, which is what keeps every
  tier on one theme.
- Logical properties only, so RTL keeps working.
- Shared state through the `#stores` alias, component-local state
  wherever you like.
- A component that renders user or CMS content sets it with
  `textContent`, or escapes it — hosted content is untrusted input.
