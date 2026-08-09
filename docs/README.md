# docs — the platform-native edition

THE frontend, rebuilt on what the web platform ships in 2026. The
toolchain is still deleted — but this time the _workarounds_ are too:

- **No build step** — browser-native ES modules; `css/app.css` is the
  "bundle" (plain `@import`). Deploying is copying this folder to any
  static host (Pages serves `master:/docs`).
- **No router** — real `.html` pages. Cross-document **View Transitions**
  (`@view-transition { navigation: auto }` in `css/site.css`) morph
  matching elements between pages (product card title → product h1), and
  a **speculation-rules** block in each head prerenders likely next pages,
  so MPA navigation feels SPA-instant with zero navigation JS. The old
  fetch-and-morph client router (idiomorph) is gone.
- **A real component library, no build required** — [Web Awesome]
  (Shoelace's successor, pinned `@3.11.0` from jsdelivr): drawer (the
  cart), tab-group (account), rating (reviews), otp-input + qr-code
  (2FA), markdown (hosted pages), toast, skeleton, copy-button. This is
  the community-components story for no-build sites: web components.
- **No RTL stylesheet** — the CSS is logical-properties-only; Arabic is
  `dir="rtl"` and everything flips, Web Awesome included.
- **A first-party component layer** — `js/components/` holds the site's
  own custom elements: the shared chrome (`<s2-nav>` / `<s2-footer>` /
  `<s2-cart-drawer>` — HTML still has no native include; this is the
  platform's least-bad answer, with boxes reserved in CSS so upgrading
  never shifts layout) plus gap-fillers like `<s2-product-card>` and
  extensions like `<s2-search>` (a `class extends WaInput`, imported
  through the `wa/` import map in each head), compiled `*.gen.js`
  artifacts authored in React/Vue/Svelte/Lit (built once in the
  repo-root `component-factory/`), and `react-jit/` (React with a
  lazy-loaded shared engine, zero build). The contract is defined in
  [js/components/README.md](js/components/README.md); lab.html is the
  live proof that five engines drive one state atom.
- **One state layer** — [js/stores.js](js/stores.js) holds nanostores
  atoms (`$session`, `$cart`, …), imported by every tier through the
  `#stores` import-map alias so each page has exactly one instance of
  each atom. Components subscribe; api/store mutations refresh.
- **No file over ~200 lines** — `js/` is the client core (config/api/
  store/chrome/cart/payment), `js/pages/` one small script per page.

Everything server-side is the baas: guest-by-default sessions, hybrid
search, discounts, the embedded payment element (gateway.md), digital
delivery claims (delivery.md), 2FA, Google OAuth, subscriptions.
`js/config.js` is the one file to edit.

## The head is the boilerplate budget

Each page repeats ~15 head lines (meta, one stylesheet, three scripts,
speculation rules, OG tags). That duplication is the one genuinely
unsolved gap in no-build HTML — includes don't exist yet. Everything
below the head is one `<s2-nav>`, the page's own `<main>`, one
`<s2-footer>`.

A tiny inline script in each head applies theme + locale classes
**before first paint** (no dark-mode flash, works in prerendered pages);
`js/chrome.js` re-applies on `pageshow` so pages prerendered before a
toggle activate correctly.

## Run it locally

Any static file server works — there is nothing to build:

```bash
cd docs
python3 -m http.server 8080 --bind 0.0.0.0   # or: bunx serve .
# → http://localhost:8080
```

On **WSL2**, `--bind 0.0.0.0` matters: a server bound to `127.0.0.1`
inside WSL is invisible to a Windows browser (VS Code Live Preview does
exactly that — hence "site can't be reached"). Bound to `0.0.0.0` it is
reachable as `localhost` and via the WSL IP (`hostname -I`).

Notes:

- `file://` (double-clicking index.html) will NOT work — browsers block
  ES-module imports without a server.
- View Transitions + speculation rules are progressive enhancement:
  Chromium gets morphing + prerender, everything else gets plain (still
  correct) navigations.
- If the catalog is empty, the hosted project probably has no synced
  config/seed yet: `./cli.sh sync push && ./cli.sh seed push` (needs
  `.owner-creds.json` filled in).

## devgit — edit the site from the site

No build step cuts both ways: since the deployed file IS the source, the
browser can be the editor. `dev.html` stores a fine-grained GitHub PAT
(one repo, Contents: read/write) in localStorage; every page then grows a
`</>` button. "Edit this page" re-renders the pristine repo file with
scripts inert — at that point **the DOM is the file** — so you, DevTools,
or a Claude browser extension can mutate it. Review the line diff, commit
— the push to `master:/docs` IS the deploy. No server anywhere in the
loop — the browser talks to api.github.com directly. Not just HTML:
"Edit css / js / any file" opens any repo file as text — `css/app.css`
previews live on the page as you type. Agents get console hooks:
`s2devgit.enterEdit()` → mutate → `s2devgit.push("msg")` for pages;
`s2devgit.readFile(path)` / `s2devgit.writeFile(path, text, "msg")` for
everything else. Four files: `js/devgit.js`, `js/devgit-github.js`,
`js/devgit-diff.js`, `js/devgit-files.js`.

## Theming (tweakcn → Web Awesome)

The hosted theme document (`hono-aep-baas-config/themes/default.cms.css`)
still drives the whole site, now through `css/theme-bridge.css`: every
tweakcn token (`--primary`, `--background`, `--radius`, fonts, …) is
chained into Web Awesome's `--wa-*` vocabulary and this site's `--s2-*`
tokens, with editorial-palette fallbacks so the site renders theme-less.
Dark mode is one toggle setting `.dark` (the theme's scope) + `.wa-dark`
(Web Awesome's scope); the var() chains re-resolve on their own.
Restyle = edit the theme + `sync push` — or the studio, or MCP.

[Web Awesome]: https://webawesome.com
