# hono-aep-baas-cli

The layer-3 maintenance CLI for a hono-aep-baas project. Sign up on the
hosted baas, create a project, keep two gitignored files at your repo
root — `.owner-creds.json` (who you are to the platform; sk_key) and
`platform-creds.json` (the values your project hands to third parties)
— then:

```sh
bunx hono-aep-baas-cli sync diff   --dir hono-aep-baas-config
bunx hono-aep-baas-cli sync push   --dir hono-aep-baas-config
bunx hono-aep-baas-cli seed push   --dir hono-aep-baas-idempotent-seed
bunx hono-aep-baas-cli secrets list --dir hono-aep-baas-config
bunx hono-aep-baas-cli secrets set STRIPE_SECRET_KEY --dir hono-aep-baas-config
bunx hono-aep-baas-cli validate    --dir hono-aep-baas-config
```

- Keys resolve `BAAS_KEY` → `.owner-creds.json` (the `--dir`, then its
  parent) — no env ceremony.
- `secrets set NAME` with no literal reads the value from
  `platform-creds.json`; `sync push` does the same for every EnvRef in
  `secrets.cms.json` (spec/secrets.md §3.1). Values never reach git and
  are write-only on the server (digest-listed).
- `validate` enforces the hosted JSON Schemas every repo file declares
  via `$schema` (non-zero exit on any failure — CI-able).

Same contract as the studio and the MCP: everything is the public /v1.
Bun-first (`bunx` / a `bun`-shebang bin); the sync/seed modules are
importable (`hono-aep-baas-cli/sync`) — the baas repo's own bin/ shims
re-export them.
