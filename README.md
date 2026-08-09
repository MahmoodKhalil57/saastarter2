# saastarter2

A complete, self-serve ecommerce/SaaS site with **no build step and no
server in this repo**: raw HTML + Bootstrap on any static host (GitHub
Pages reference), with the whole backend *declared in git* and hosted
by a [hono-aep-baas](https://mizan-gpp.the-montiapple.workers.dev) —
auth (email/password, Google, 2FA), commerce (cart → Stripe → orders →
fulfillment), blog, reviews, i18n (en/ar), PWA, generated admin panel,
SEO/OG/llms.txt. The deployed files ARE the source.

```
pure-frontend/                  the site (publish = copy these files)
hono-aep-baas-config/           the backend, declared   (./cli.sh sync)
hono-aep-baas-idempotent-seed/  the data, declared      (./cli.sh seed)
cli.sh                          the one entry (npm: hono-aep-baas-cli) — run it bare for help
```

## Use this as YOUR template (no contact with the author needed)

1. **Fork/clone**, then create your backend project:
   open the platform **studio** → <https://mizan-gpp.the-montiapple.workers.dev/studio>,
   sign up, click **New project**, and mint an **sk_ key** on the Keys tab.
2. **Save two gitignored files at the repo root** (both have hosted
   `$schema`s; never commit them):
   - `.owner-creds.json` — `{ "email": …, "password": …, "sk_key": "sk_live_…" }`
   - `platform-creds.json` — `{ "GOOGLE_CLIENT_ID": …, "STRIPE_SECRET_KEY": …, … }`
     (your own OAuth/Stripe values; referenced from `secrets.cms.json` as EnvRefs)
3. **Re-point the clone at your coordinates** (rewrites every file + resets the seed ledger):
   ```sh
   ./cli.sh init <your-project-id> https://<you>.github.io/<repo>
   ```
4. **Push the declared backend, data, and secrets; go live:**
   ```sh
   ./cli.sh sync push     # definitions, theme, pages, forms, project doc, secrets
   ./cli.sh seed push     # products, posts, discounts, demo users (idempotent)
   ./cli.sh publish       # force-push pure-frontend → gh-pages
   ```
5. Day-2: edit config/seed files (every JSON declares a hosted
   `$schema` — your editor validates as you type; `./cli.sh validate`
   enforces in CI), or use the **studio** (visual), or the project
   **MCP** (`/v1/projects/{id}/mcp`) from an agent. Store admin lives at
   `/v1/projects/{id}/site/admin.html` (unlock with your sk_ key).

Everything above goes through the platform's public API with YOUR
account — same contract for the CLI, the studio, and MCP.

## Local development

```sh
./cli.sh serve         # pure-frontend at http://localhost:8899 (binds 0.0.0.0)
./cli.sh sync          # bare = diff (safe); same for seed
./cli.sh secrets       # bare = list (digests only; values are write-only)
```

## Known limits

- Stripe **webhook confirmation** currently verifies with the platform
  operator's webhook secret — embedded payments with your own Stripe
  keys create PaymentIntents in your account, but automatic
  paid-transition via webhook is pending per-project webhook
  verification (spec/secrets.md). Ask-the-platform-free workaround:
  fulfil from the admin panel.
- `robots.txt`/`sw.js` are origin-bound: the hosted generated copies
  are canonical; this repo carries a same-origin `sw.js` importScripts
  stub and no robots.txt (GitHub project pages can't serve one at the
  domain root anyway).
