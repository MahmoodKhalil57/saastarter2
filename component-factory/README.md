# component-factory — the build that lives OUTSIDE the site

The site (`docs/`) has no build step, ever. This workspace is where the
one-time builds happen instead: components authored in framework
languages are compiled into self-registering custom-element artifacts at
`docs/js/components/*.gen.js`, then committed like any other file. Run
it when a source here changes; nothing in deployment or serving depends
on it.

```bash
cd component-factory
bun install
bun run build      # → docs/js/components/counter-*.gen.js
```

## Directories

| dir       | authored as                                                                                                               | compiled by                                                                                                                  | example                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `lit/`    | LitElement (plain JS)                                                                                                     | Bun bundler                                                                                                                  | `counter-lit.js` → 15KB        |
| `react/`  | real JSX / TSX                                                                                                            | Bun (native JSX) + a `createRoot` custom-element wrapper                                                                     | `counter-react.tsx` → 182KB    |
| `svelte/` | Svelte 5 **runes mode** (`runes: true` — legacy Svelte-4 syntax is a compile error) with `<svelte:options customElement>` | svelte/compiler → Bun                                                                                                        | `counter-svelte.svelte` → 51KB |
| `vue/`    | SFC (options API)                                                                                                         | vue/compiler-sfc (template → render fn, no runtime compiler shipped) + `defineCustomElement(…, { shadowRoot: false })` → Bun | `counter-vue.vue` → 69KB       |

There is a FIFTH React path that deliberately isn't here:
`docs/js/components/react-jit/` ships React components as source with a
lazy shared engine — no build at all. Rule of thumb: one-off React
component → compile it here (self-contained, works offline); several
React components or community npm components → react-jit (one shared
runtime, esm.sh ecosystem access).

## Invariants the build enforces (build.ts)

- `#stores` and `nanostores` are EXTERNAL — resolved at runtime through
  the page import map so every artifact shares the site's single atom
  instances. Bundling them would silently fork cross-engine state.
- Framework runtimes are BUNDLED — an artifact is one file, resolvable
  by a browser, no npm at runtime.
- `process.env.NODE_ENV` is `"production"`, Vue feature flags are set.
- Every artifact gets a provenance banner; `.gen.js` files are never
  edited by hand.

Weight is visible in the build output on purpose — each artifact carries
its runtime, so N react artifacts = N copies of React. That trade is the
whole reason react-jit exists.

The artifact contract itself (tags, state, theming, light DOM) lives in
`docs/js/components/README.md` — a factory source must obey it like any
hand-written component.
