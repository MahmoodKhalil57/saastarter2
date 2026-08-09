#!/usr/bin/env bash
# saastarter2/cli.sh — the one entry for every maintenance loop.
#   ./cli.sh sync [diff|push|pull|fmt]     config repo → baas
#   ./cli.sh seed [diff|push|pull|fmt]     data repo → baas
#   ./cli.sh secrets [list|set N|delete N] per-project secrets
#   ./cli.sh validate                      both repos vs hosted $schemas
#   ./cli.sh serve                         pure-frontend on :8899
#   ./cli.sh publish                       force-push pure-frontend → gh-pages
# Keys come from .owner-creds.json, secret values from platform-creds.json.
set -euo pipefail
cd "$(dirname "$0")"

baas() { # local suite checkout when present, npm otherwise
  if [ -f ../customPackages/hono-aep-baas-cli/bin/baas.ts ]; then
    bun ../customPackages/hono-aep-baas-cli/bin/baas.ts "$@"
  else
    bunx hono-aep-baas-cli "$@"
  fi
}

case "${1:-help}" in
  sync)     shift; baas sync  "${@:-diff}" --dir hono-aep-baas-config ;;
  seed)     shift; baas seed  "${@:-diff}" --dir hono-aep-baas-idempotent-seed ;;
  secrets)  shift; baas secrets "${@:-list}" --dir hono-aep-baas-config ;;
  validate) baas validate --dir hono-aep-baas-config
            baas validate --dir hono-aep-baas-idempotent-seed ;;
  serve)    exec bun -e 'Bun.serve({ port: 8899, hostname: "0.0.0.0", fetch(r) {
              const p = new URL(r.url).pathname.replace(/\/$/, "/index.html");
              return new Response(Bun.file("pure-frontend" + p));
            }}); console.log("serving pure-frontend at http://localhost:8899")' ;;
  publish)  remote=$(git remote get-url origin)
            tmp=$(mktemp -d) && cp -r pure-frontend/* "$tmp"
            git -C "$tmp" init -q -b gh-pages && git -C "$tmp" add -A
            git -C "$tmp" commit -q -m "publish: $(date -u +%Y-%m-%dT%H:%MZ)"
            git -C "$tmp" push -f "$remote" gh-pages:gh-pages && rm -rf "$tmp" ;;
  *)        sed -n '3,9p' "$0" ;;
esac
