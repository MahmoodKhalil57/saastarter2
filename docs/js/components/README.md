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
3. **Theming = CSS custom properties only.** Components style themselves
   in terms of `--s2-*` / `--wa-*` tokens (see css/theme-bridge.css).
   Custom properties inherit through shadow roots, so this rule is what
   keeps every tier — Web Awesome, ours, future compiled ones — on the
   one hosted theme.
4. **Light DOM by default.** The page cascade applies, and
   `view-transition-name`s stay visible to cross-document morphs. Reach
   for shadow DOM only when internal structure must be inviolable —
   that's tier 3 below, and it's allowed, just not the default.
5. **App coupling is allowed, one way.** Components may import app
   modules (`../store.js`, `../api.js`, `../chrome.js`); app modules may
   import components; pages just use tags.

## The three tiers

| Tier | When | Example here |
| --- | --- | --- |
| **Compose** Web Awesome | the component exists, you're arranging it | `cart-drawer.js` — `<s2-cart-drawer>` is a `wa-drawer` plus store logic |
| **Extend** Web Awesome | the component almost exists | `search.js` — `<s2-search>` is `class extends WaInput` (imported via the `wa/` import map) plus a debounced `s2-search` event |
| **From scratch** | the library has no such thing | `nav.js`, `footer.js`, `product-card.js` — plain `HTMLElement` subclasses |

Web Awesome's classes are real ESM exports on the pinned CDN, so tier 2
is ordinary subclassing — you inherit the shadow template, form
association, and theme styling, and add behavior. The `wa/` prefix is
mapped in every page's `<script type="importmap">`; bumping the pinned
version = editing that map + css/app.css.

## The future tier: compiled components (build-once, elsewhere)

The point of the contract is that this directory doesn't care how a
component was AUTHORED. Svelte, Vue, and Lit can compile a component to
a custom element; React can be wrapped into one. A separate project can
do that compile ONCE and emit **a single self-registering ESM file**
per component into `vendor/` here — at which point it is
indistinguishable from tier 3: one import (or a `<script type="module">`
tag), one tag name, tokens for theming. The site itself never gains a
build step; the build lives and dies in the producing repo.

Rules for a vendored artifact, so it stays honest:

- self-contained (its framework runtime bundled in, dependencies
  inlined) — one file, no npm resolution at runtime;
- registers exactly its own `s2-*` tags, guarded;
- themable via custom properties, no baked-in colors;
- committed with a one-line provenance comment (source repo + version)
  at the top, because there is no lockfile to remember for you.
