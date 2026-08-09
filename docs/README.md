# docs — the raw-HTML edition

THE frontend (the React edition it started as a sibling of is deleted —
this is the store now), with the entire toolchain deleted:

- **No build step** — browser-native ES modules (`<script type="module">`);
  deploying is copying this folder to any static host.
- **No router** — real `.html` pages; deep links are just files.
- **No component library** — Bootstrap 5.3 from a CDN (`data-bs-theme`
  gives dark mode; the `.rtl.css` build gives Arabic).
- **No file over 150 lines** — `js/` is the client core (config/api/
  store/ui/payment), `js/pages/` is one small script per page.

Everything server-side is the baas: guest-by-default sessions, hybrid
search, discounts, the embedded payment element (gateway.md), digital
delivery claims (delivery.md), 2FA, Google OAuth, subscriptions.
`js/config.js` is the one file to edit.

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
- VS Code Live Preview serves it fine, but view it in a REAL browser
  (open the `127.0.0.1:...` URL in Chrome), not the embedded preview
  panel — the panel's webview blocks the CDN + API requests this app
  makes. Set `livePreview.openPreviewTarget` to `External Browser`.

## devgit — edit the site from the site

No build step cuts both ways: since the deployed file IS the source, the
browser can be the editor. `dev.html` stores a fine-grained GitHub PAT
(one repo, Contents: read/write) in localStorage; every page then grows a
`</>` button. "Edit this page" re-renders the pristine repo file with
scripts inert — at that point **the DOM is the file** — so you, DevTools,
or a Claude browser extension can mutate it. Review the line diff, commit:
one push to the source branch, one to `gh-pages` (which is the deploy).
No server anywhere in the loop — the browser talks to api.github.com
directly. Not just HTML: "Edit css / js / any file" opens any repo file
as text — stylesheets preview live on the page as you type. Agents get
console hooks: `s2devgit.enterEdit()` → mutate → `s2devgit.push("msg")`
for pages; `s2devgit.readFile(path)` / `s2devgit.writeFile(path, text,
"msg")` for everything else. Four files: `js/devgit.js`,
`js/devgit-github.js`, `js/devgit-diff.js`, `js/devgit-files.js`.

## Theming (full tweakcn vocabulary)

The hosted theme document (`hono-aep-baas-config/themes/default.cms.css`)
drives the whole site through `css/tweakcn-adapter.css`. EVERY tweakcn
token is live: background/foreground, card, popover, primary, secondary,
muted, accent, destructive (+foregrounds), border, input, ring,
chart-1..5, the full sidebar-* set (it styles the cart drawer), radius,
font-sans/serif/mono, shadow tokens, and letter-spacing. `--spacing` is
the one non-mappable token (Bootstrap's spacing scale is compile-time).
Restyle = edit the theme + `sync push` — or the studio, or MCP.
