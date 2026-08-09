---
name: hono-aep-frontend
description: Inventory of what a no-build hono-aep static site (saastarter2 class) already makes cheap — component tiers across five engines, one shared state layer, dependency pinning without a bundler, a motion capability ladder, MPA navigation, in-browser editing — with the costs and trade-offs of each so you can choose. Use when building or changing frontend in a repo that has docs/ with an import map, js/components/, component-factory/, or cli.sh. It describes mechanisms, never design decisions.
---

# What this site already makes cheap

You are in a **no-build static site**: the files in `docs/` are the
deployed files. No bundler, no dev server, no framework runtime unless a
page asks for one. The backend is a hosted hono-aep-baas project behind
one public `/v1` contract.

**This skill is an inventory, not a style guide.** It tells you which
mechanisms exist, what each costs, and where the escape hatches are. It
does not tell you what to build, how it should look, or which of these
you should use — those are yours. Every path below is optional and every
one is deletable; the "what you can delete" section is as load-bearing as
the rest.

## Read this first: the two invariants

Break either and things fail *silently*, which is worse than loudly.

1. **One module instance of shared state per page.** Atoms live behind
   the `#stores` import-map alias. Everything — page scripts, custom
   elements, compiled artifacts — must import through that alias, never
   by relative path, and any bundler must mark it external. Two copies of
   an atom means components stop seeing each other's updates and nothing
   errors.
2. **A full-document swap re-creates every component.** Custom elements
   upgrade *after* first paint (measured here: ~144ms after FCP), so a
   navigation that replaces the document reveals a half-built page and
   the components pop in afterwards — after any view transition has
   ended, so no transition can hide it. That is why navigation morphs
   `<main>` in place instead. Prefer patching over replacing whenever the
   thing being replaced contains custom elements.
3. **Pin versions; never track a branch.** CDN URLs are cached
   immutably. `@main` plus a year-long cache is a debugging nightmare.
   `./cli.sh add` pins for you.

## The capability map

| You want to… | Mechanism | Cost |
| --- | --- | --- |
| use an off-the-shelf component | Web Awesome via the `wa/` import-map prefix | one CDN fetch, zero build |
| write your own component | a self-registering custom element in `js/components/` | ~30 lines, no tooling |
| extend a library component | subclass its exported class (`class extends WaInput`) | inherits its shadow DOM, form association, theming |
| use a React/Vue/Svelte/Lit component | compile it once with `webc-factory` → `*.gen.js` | the runtime is bundled per artifact: lit ~15KB, svelte ~51KB, vue ~69KB, react ~182KB |
| use several React components, or npm ones | `react-jit`: one shared engine, lazy-loaded | needs the network; components must handle pre/post-engine states |
| use a headless library (Base UI, Radix, Ark) | `webc-factory wrap … --compose` | +~38KB over the bare runtime; markup and CSS are yours to write |
| add any npm or GitHub module | `./cli.sh add <pkg>` / `gh:owner/repo@tag/path` | writes a pinned entry into every page's import map |
| share state across components | nanostores atoms in `js/stores.js` | ~300 bytes; works from any engine |
| animate | see `references/motion-ladder.md` | tier-dependent — 0KB for CSS, 23KB+ for a JS engine |
| move between pages | `js/router.js` morphs `<main>` in the same document (idiomorph inside `startViewTransition`); plain cross-document navigation is the no-JS fallback | one small module; the chrome and its state survive every hop |
| edit the deployed site from a browser | devgit (`</>` button once a token is configured) | only loads when configured; never for visitors |
| embed a deck, animation, diagram or 3D scene made with Claude Design | export its files into the repo, then isolate/integrate/flatten — see the `hono-aep-design-embed` skill | Design URLs cannot be hotlinked; an export is a snapshot you own |

Details: `references/component-tiers.md` (how to pick a tier, and the
`wrap` workflow), `references/motion-ladder.md` (animation, fallbacks,
device capability).

## Choosing a component tier

Cheapest thing that works, in this order:

1. **Plain HTML + CSS.** Most "components" are a `<div>` and four rules.
2. **A Web Awesome tag.** Already loaded, themed, accessible.
3. **Your own custom element** — when the site needs behavior no library
   has. Light DOM by default so the page cascade and
   `view-transition-name` still reach inside.
4. **Subclass a library component** — when one is *almost* right.
5. **A compiled artifact** — when a specific framework component earns
   its runtime weight. Check the weight table first; four React artifacts
   is four copies of React.
6. **react-jit** — when you want several React components or the npm
   React ecosystem and can accept a runtime fetch.

There is no virtue in climbing higher. A tier-5 artifact that renders a
button is worse than a `<button>`.

## Things that are true here but not elsewhere

- **`export * from "…"` shims.** `js/api.js`, `js/store.js`,
  `js/payment.js` are one-liners over the CDN client package. Edit the
  shim to wrap or override an export without touching any page.
- **Theming is one token vocabulary.** The hosted theme document drives
  `--wa-*` (Web Awesome) and `--s2-*` (site) through
  `css/theme-bridge.css`. Components should consume tokens, never
  hardcode colors — that is what keeps every tier on one theme and dark
  mode working with a single class toggle.
- **RTL is free.** The CSS is logical-properties-only. Use
  `inline-size`/`margin-inline`/`inset-inline-start`, not
  `width`/`margin-left`/`left`, and Arabic flips with no extra stylesheet.
- **The contact form has zero JavaScript in its submit path** — it POSTs
  straight to the hosted endpoint. If you touch it, keep that true.
- **The head is duplicated on purpose.** HTML has no include and there is
  no build step. ~15 lines per page is the accepted cost; the inline
  theme script must stay inline or dark mode flashes.

## What you can delete

If a path is redundant for what you're building, remove it. None of it is
structural:

| Delete | Consequence |
| --- | --- |
| `component-factory/` + `*.gen.js` | no compiled framework components; everything else works |
| `js/components/react-jit/` + its import-map pins | no runtime React |
| `docs/lab.html` | nothing — it is a proving ground |
| devgit pins + `dev.html` | no in-browser editing |
| any `js/components/*.js` | that tag stops existing; nothing else notices |
| the speculation-rules block | navigation still works, just not prerendered |
| `css/theme-bridge.css` | components fall back to their own defaults; you own theming again |

Deleting is the expected outcome for most of these on most sites. Say so
plainly rather than leaving unused machinery in place.

## When the answer is not in this repo

Anything that must *execute* on a server — payment or delivery drivers,
inbound webhooks, email, scheduled work, image derivatives — is platform
territory, not frontend. The baas client skill
(`hono-aep-baas-client`) covers the `/v1` contract and the escalation
path for filing platform issues.

## What this skill will not do

It will not choose your layout, palette, type scale, motion language, or
component taste. Those are design decisions and they belong to whoever is
designing. When you need a visual direction, ask for it or propose one
explicitly as a proposal — do not infer it from this document, which is
deliberately silent on it.
