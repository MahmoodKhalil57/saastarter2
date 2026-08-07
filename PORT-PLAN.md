# saastarter2 — porting saastarter to mizan-gpp

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

**P4 — polish**: field localization (cms localization.md — the hard
dependency for blogs/products), search + related items (search kind),
counters/analytics (quotas/KV story), realtime order status (umbrella
§3a realtime, events grammar), public/private OpenAPI split.

## Frontend

STATIC react-router (SPA mode, `ssr:false`) + shadcn — beginner-
friendly by design: `bun create`, edit pages, `bun run build`, host the
dist anywhere. The suite's base component contract applies. Pages: landing/marketing (static + i18n messages in
this repo), blogs, products, checkout, account (settings/security/
billing/orders/wishlist/developer), auth views. Message catalogs are
plain files here, git-versioned — not a baas concern.
