# saastarter2

The **flagship mizan-gpp consumer**: a beginner-friendly STATIC
react-router + shadcn site on **GitHub Pages**, with its whole backend
declared in git and hosted by the baas. No server anywhere in this repo.

```
hono-aep-baas-config/   the backend, declared (sync push/pull)
frontend/               static react-router SPA + shadcn (hono-aep-ui)
.github/workflows/      build → deploy-pages
PORT-PLAN.md            the saastarter feature map (P0–P4)
```

## Two-minute setup

```sh
# 0. account + sync key (once): sign up on the baas, then
#    POST /v1/keys:mint with your session → export BAAS_KEY=sk_live_…

# 1. push the declared backend (project + contact form):
bun ../hono-aep-baas/bin/sync.ts push --dir hono-aep-baas-config

# 2. declare the blog collection (or click it together in the dashboard —
#    three surfaces, one API):
curl -X PUT "$ENDPOINT/v1/projects/saastarter2/collections/blog" \
  -H "Authorization: Bearer $BAAS_KEY" -H "Content-Type: application/json" \
  -d '{"definition":{"singular":"post","plural":"posts",
       "fields":[{"name":"title","type":"string","required":true},
                 {"name":"body","type":"string","required":true},
                 {"name":"category","type":"string","enum_values":["news","guide"]}],
       "states":["DRAFT","PUBLISHED"],"initial_state":"DRAFT",
       "transitions":[{"verb":"publish","from":["DRAFT"],"to":"PUBLISHED"}],
       "policy_create":"authenticated","policy_update":"authenticated",
       "policy_delete":"authenticated"}}'
#    It is LIVE immediately — no migration, no restart (JIT mode).

# 3. pull the reified config (brings the contact form's pk_ key):
bun ../hono-aep-baas/bin/sync.ts pull --dir hono-aep-baas-config
#    → paste endpoint/project/key into frontend/src/config.ts

# 4. run it:
cd frontend && bun install && bun run dev
```

## Deploy

Push to `main` → the workflow builds and deploys to GitHub Pages.
`frontend/src/config.ts` `basename` must match your repo name (or "" for
a user site / custom domain). The build emits `404.html` (deep-link
fallback) and `.nojekyll` automatically; assets resolve under the base
path. The API serves wildcard CORS without credentials (site.md §2a), so
the Pages origin talks to it with keys — never cookies.

## What this proves

- Backend-in-git: `git clone` + `sync push` reproduces the product.
- Hosted collections (JIT): declare → live, policies/transitions/filters
  included; blog reads are public, writes need your key.
- The founding constraint survives sophistication: the contact form is
  STILL a plain HTML POST (honeypot, `_replyto`, `_redirect`) — no
  JavaScript in the submit path.
