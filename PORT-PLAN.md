# saastarter2 — porting saastarter to mizan-gpp

## STATUS — 2026-08-08: the port is COMPLETE and live (and exceeds the original)

Frontend: https://mahmoodkhalil57.github.io/saastarter2 — the PURE
edition (raw HTML + Bootstrap CDN + browser-native ES modules; no build
step, no router, no framework; ~1,000 lines total, largest file 146).
The React `frontend/` was deleted 2026-08-08 once the pure port reached
parity — the capabilities all live in the baas, so the frontend is a
rendering choice, and the beginner-friendly one won. Backend: mizan-gpp
on Cloudflare Workers (D1 + R2 + Workers AI) · Project `b40546af-b19c-46ca-8661-87db12b3e85a`.
Reproducible from nothing: `sync push` (definitions) + `seed push` (data,
baas/seed.md — idempotent, lock-ledgered). 491 tests green across 19 suites;
every feature below verified in a real browser against the live deployment.

| Phase | State |
|---|---|
| P0 forms (contact/newsletter) | ✅ live |
| P1 collections (blog, reviews, wishlist, discounts as .cms.json) | ✅ live |
| P2 auth pool (email+password, sessions, reset, change-email, verified anonymizing delete, profile+avatar) | ✅ live (OAuth/passkeys: capability built, not yet exposed per-pool) |
| P3 commerce (cart/checkout/discounts/fulfillment/orders/stats + Stripe payment→order bridge) | ✅ live — all 5 commerce.md flows |
| P3+ subscriptions ($9/mo recurring + renew/lapse lifecycle + customer portal) | ✅ live — the original had NONE of this |
| P4 site (dark mode, PWA SW, SEO artifacts, hosted pages, localized pages `slug@locale`, field i18n en/ar + RTL, hybrid search, media/R2 avatars, wide events + merchant stats) | ✅ live |

Beyond the original: subscriptions + portal, semantic search (no SaaSignal
rent), installable PWA, localized hosted pages, idempotent data seed,
per-request wide events. Deliberately parked (recorded reasons): image
derivatives (needs a resize provider), SPA locale-prefix routing +
hreflang, OTLP-HTTP export/dashboards (the seam exists), §3a
multi-tenancy (spec-gated on a second org).

---

The flagship consumer: backend declared in `hono-aep-baas-config/`,
frontend react-router (framework mode) + shadcn. The port is the
demand-driver for the baas spec — every feature maps to a branch, and
`grep -rn "TODO(saastarter)"` across the specs answers "what's left".

Source surveyed: `packages/saastarter` (Next 16 + Payload 3 +
better-auth + Stripe ecommerce + i18n; full inventory in the baas spec
round of 2026-08-07).

## Architecture stance (collections.md §4)

- The baas hosts: state (collections), end-user auth (pools), delivery
  (jobs/notifications/webhooks), contracts (OpenAPI/MCP), files (media).
- The frontend is a **basic, beginner-friendly STATIC react-router
  (SPA mode) + shadcn app** — no server code, hostable anywhere static.
  Everything comes from the baas over HTTP (pk_ embeds, session auth
  when the pool lands). The bespoke money-math endpoints are therefore
  NOT ported in the static flagship: checkout/payments wait for the
  billing kind's hosted surface (P3), or an advanced consumer adds an
  optional thin server — never the beginner path.
- Fixed by construction: saastarter's world-readable PII + world-writable
  blogs (open-access defaults) and its unauthenticated job callback —
  fail-closed policies and signed delivery replace them.

## Phases (each row names its spec branch)

**P0 — works today** (this config): contact + newsletter as baas forms
(honeypot, autoresponder, owner email, webhooks); sync push/pull.

**P1 — collections core** (`baas/collections.md`): blogs, faqs,
reviews, wishlists as hosted collections → needs hasMany references,
unique/index knobs, named policy aliases; media uploads → derivatives
(TODO(saastarter) at media).

**P2 — auth pool** (`baas/auth-pools.md`): end users (email+password
verified, Google OAuth, passkeys), sessions-as-data, change-email,
verified deletion w/ anonymization transition; key delegation for the
developer tab (keys.md §2a).

**P3 — commerce**: products/variants/carts/orders as collections +
transitions (fulfillment states, order emails = notify bindings, low
stock = event → jobs); payments via billing kind (customer link,
intents) + connections INBOUND (signed Stripe webhooks); discount
engine stays app-side (react-router actions).

**P4 — site documents** (`baas/site.md`): the 10 color schemes + dark
mode port as hosted tweakcn THEMES (one `<link>` tag); marketing pages
optionally as Puck pages AND standalone Puck block fragments (hero/
pricing/footer rendered as-is inside code routes); PWA (manifest/icons/
SW from site.app + theme, installable off Pages) + SEO artifacts
(sitemap/robots/llms/.md mirrors) reified into public/ at build; the white-label admin mounts
in the SPA behind the auth pool. Also: field localization (cms localization.md — the hard
dependency for blogs/products), search + related items (search kind),
counters/analytics (quotas/KV story), realtime order status (umbrella
§3a realtime, events grammar), public/private OpenAPI split.

## Frontend

STATIC react-router (SPA mode, `ssr:false`) + shadcn — beginner-
friendly by design: `bun create`, edit pages, `bun run build`, host the
dist anywhere — **GitHub Pages is the reference host** (site.md §2a:
basename config, 404.html fallback, prerendered page routes, .nojekyll,
deploy-pages CI; Bearer-only auth from the static origin). The suite's
base component contract applies. Pages: landing/marketing (static + i18n messages in
this repo), blogs, products, checkout, account (settings/security/
billing/orders/wishlist/developer), auth views. Message catalogs are
plain files here, git-versioned — not a baas concern.
