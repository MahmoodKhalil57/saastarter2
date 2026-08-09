# js/components — the site's component layer

Web Awesome is the community layer; this directory is what it can't be:
components this site needs that no library ships, and extensions of
library components. Everything here is a **standard custom element** —
the platform's component model — so nothing in this directory ever
requires a build step, and anything that COMPILES to a custom element
can join it later.

## The contract (every file in this directory obeys it)

1. **One component = one self-registering ESM file.** Importing the file
   defines the tag; there is no framework object to construct. Tags are
   prefixed `s2-`. Registration is guarded
   (`if (!customElements.get(tag))`) so double imports are harmless.
2. **API = the DOM's API.** Attributes (kebab-case) and properties in;
   `CustomEvent`s out (names prefixed `s2-`, `bubbles: true`); `slot`s
   for content. Never a callback prop, never a framework value.
3. **State = nanostores atoms from `#stores`.** Cross-component state
   lives in `js/stores.js`, imported by EVERYONE — site modules, these
   components, compiled artifacts, react-jit — through the `#stores`
   import-map alias, never by relative path and never bundled. One page,
   one instance of every atom; that is what lets five different engines
   drive the same value (see lab.html). Component-local UI state can stay
   local.
4. **Theming = CSS custom properties only.** Components style themselves
   in terms of `--s2-*` / `--wa-*` tokens (see css/theme-bridge.css).
   Custom properties inherit through shadow roots, so this rule is what
   keeps every tier — Web Awesome, ours, future compiled ones — on the
   one hosted theme.
5. **Light DOM by default.** The page cascade applies, and
   `view-transition-name`s stay visible to cross-document morphs. Reach
   for shadow DOM only when internal structure must be inviolable —
   that's tier 3 below, and it's allowed, just not the default.
6. **App coupling is allowed, one way.** Components may import app
   modules (`../store.js`, `../api.js`, `../chrome.js`); app modules may
   import components; pages just use tags.

## The three tiers

| Tier                         | When                                                                 | Example here                                                                                                                  |
| ---------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Compose** Web Awesome      | the component exists, you're arranging it                            | `cart-drawer.js` — `<s2-cart-drawer>` is a `wa-drawer` plus store logic                                                       |
| **Extend** Web Awesome       | the component almost exists                                          | `search.js` — `<s2-search>` is `class extends WaInput` (imported via the `wa/` import map) plus a debounced `s2-search` event |
| **From scratch**             | the library has no such thing                                        | `nav.js`, `footer.js`, `product-card.js` — plain `HTMLElement` subclasses                                                     |
| **Compiled** (`*.gen.js`)    | authored in React/Vue/Svelte/Lit, built ONCE in `component-factory/` | `counter-*.gen.js` — self-registering artifacts, runtime bundled in, never edited by hand                                     |
| **react-jit** (`react-jit/`) | React without any build — a shared engine lazy-loads on first use    | `react-jit/counter.element.js` — see `react-jit/README.md` for the pre/post-engine contract                                   |

Web Awesome's classes are real ESM exports on the pinned CDN, so tier 2
is ordinary subclassing — you inherit the shadow template, form
association, and theme styling, and add behavior. The `wa/` prefix is
mapped in every page's `<script type="importmap">`; bumping the pinned
version = editing that map + css/app.css.

## The compiled tier: component-factory/ → *.gen.js

The contract doesn't care how a component was AUTHORED. The repo-root
`component-factory/` workspace holds `react/`, `vue/`, `svelte/`, and
`lit/` source directories; `bun run build` there compiles each source
into **a single self-registering ESM artifact** here, named `*.gen.js` —
at which point it is indistinguishable from tier 3: one import, one tag,
tokens for theming. The site itself never gains a build step; the build
lives and dies in the factory.

Rules for a generated artifact (enforced by the factory build):

- framework runtime bundled IN — one file, no npm resolution at runtime;
- `#stores` and `nanostores` left EXTERNAL — atoms must be the page's
  single instances, or cross-engine state silently forks;
- registers exactly its own `s2-*` tags, guarded;
- themable via custom properties, no baked-in colors;
- provenance banner on line 1 (which source file, how to rebuild) —
  never edit a `.gen.js` by hand.

Artifact weight is the trade to watch: lit ~15KB, svelte ~52KB,
vue ~71KB, react ~182KB (each artifact carries its runtime). For React
specifically, `react-jit/` inverts the trade: no build, source shipped
as-is, ONE engine lazy-loaded from the CDN and shared by every jit
component — and real React off esm.sh means community React packages can
ride along. Its price is the pre/post-engine states every jit component
must handle (`react-jit/README.md`).

lab.html is the proof page: five engines + a plain module, one atom.
