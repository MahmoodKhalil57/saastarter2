# react-jit — React components with a lazy, shared engine

This directory ships React components **without a build step**: the React
runtime (react + react-dom/client + htm, pinned in every page's import
map) is fetched from the CDN the first time a react-jit element connects,
then shared by every jit component on the page. Pages that use none of
them never load React at all.

Why it exists: the compiled tier (component-factory/react) bundles the
React runtime into every artifact; this tier trades a runtime fetch for
zero build and ONE shared engine — and because the engine is real React
off esm.sh, community React packages can be imported the same way
(`import X from "https://esm.sh/<pkg>"`) inside a factory.

## The pre/post-engine contract (non-negotiable)

The engine is **not guaranteed to have loaded by the time the element
renders** — and not guaranteed to load at all (offline, CDN outage).
Every jit component must therefore be smooth in three states, which
`define.js` manages via the `engine-state` attribute:

| state     | what the user sees                                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loading` | the element's author-provided light-DOM children, untouched — write honest fallback content (static text, a skeleton, the no-JS version), never an infinite spinner |
| `ready`   | the mounted React tree (fallback swapped out in one `replaceChildren` — no flash of empty)                                                                          |
| `failed`  | the fallback again, permanently — degradation, not breakage                                                                                                         |

Style states from CSS if needed: `s2-counter-jit[engine-state="loading"] { … }`.

## Authoring

Two files per component:

- `<name>.js` — the FACTORY: `export default ({ React, html, useStore }) => function Component(props) { … }`.
  `html` is htm bound to createElement (JSX shape, no compiler);
  `useStore` subscribes a `#stores` atom. No JSX in this directory —
  if you want real JSX authoring, that's `component-factory/react`.
- `<name>.element.js` — the self-registering entry:
  `defineReactComponent("s2-<name>", () => import("./<name>.js"))`.

Attributes present at connect become initial props (kebab → camelCase);
live state flows through `#stores` atoms like every other tier.
