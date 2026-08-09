#!/usr/bin/env bash
# saastarter2/cli.sh — the one entry for every maintenance loop.
#   ./cli.sh sync [diff|push|pull|fmt]     config repo → baas
#   ./cli.sh seed [diff|push|pull|fmt]     data repo → baas
#   ./cli.sh secrets [list|set N|delete N] per-project secrets
#   ./cli.sh validate                      both repos vs hosted $schemas
#   ./cli.sh serve                         pure-frontend on :8899
#   ./cli.sh publish                       force-push pure-frontend → gh-pages
#   ./cli.sh init PROJECT_ID [SITE_URL]    re-point a fresh clone at YOUR project
# Keys come from .owner-creds.json, secret values from platform-creds.json.
set -euo pipefail
cd "$(dirname "$0")"

baas() { # suite checkout → vendored tools/baas-cli → npm
  if [ -f ../customPackages/hono-aep-baas-cli/bin/baas.ts ]; then
    bun ../customPackages/hono-aep-baas-cli/bin/baas.ts "$@"
  elif [ -f tools/baas-cli/bin/baas.ts ]; then
    [ -d tools/baas-cli/node_modules ] || (cd tools/baas-cli && bun install)
    bun tools/baas-cli/bin/baas.ts "$@"
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
  init)     # ./cli.sh init <project-id> [site-url] [endpoint] — a fresh
            # fork becomes YOURS: every coordinate in HTML/config/seed
            # files is rewritten, the seed ledger resets. Then: put your
            # .owner-creds.json + platform-creds.json at the repo root,
            # ./cli.sh sync push && ./cli.sh seed push && ./cli.sh publish.
            new_project=${2:?usage: ./cli.sh init PROJECT_ID [SITE_URL] [ENDPOINT]}
            old_project=$(bun -e 'console.log(JSON.parse(await Bun.file("hono-aep-baas-config/baas.json").text()).project)')
            old_endpoint=$(bun -e 'console.log(JSON.parse(await Bun.file("hono-aep-baas-config/baas.json").text()).endpoint)')
            old_site=$(bun -e 'console.log(JSON.parse(await Bun.file("hono-aep-baas-config/project.cms.json").text()).site.url)')
            new_site=${3:-$old_site}; new_endpoint=${4:-$old_endpoint}
            old_origin=$(bun -e "console.log(new URL('$old_site').origin)")
            new_origin=$(bun -e "console.log(new URL('$new_site').origin)")
            grep -rl "$old_project\|$old_origin\|$old_endpoint" pure-frontend hono-aep-baas-config hono-aep-baas-idempotent-seed --include="*.html" --include="*.js" --include="*.json" --include="*.webmanifest" 2>/dev/null \
              | while read -r f; do
                  sed -i "s|$old_project|$new_project|g; s|$old_site|$new_site|g; s|$old_origin|$new_origin|g; s|$old_endpoint|$new_endpoint|g" "$f"
                done
            printf '{\n  "$schema": "%s/v1/schemas/seed-lock.json"\n}\n' "$new_endpoint" > hono-aep-baas-idempotent-seed/seed-lock.json
            echo "re-pointed → project $new_project · site $new_site · endpoint $new_endpoint"
            echo "next: add .owner-creds.json + platform-creds.json, then ./cli.sh sync push && ./cli.sh seed push" ;;
  publish)  remote=$(git remote get-url origin)
            tmp=$(mktemp -d) && cp -r pure-frontend/* "$tmp"
            git -C "$tmp" init -q -b gh-pages && git -C "$tmp" add -A
            git -C "$tmp" commit -q -m "publish: $(date -u +%Y-%m-%dT%H:%MZ)"
            git -C "$tmp" push -f "$remote" gh-pages:gh-pages && rm -rf "$tmp" ;;
  *)        sed -n '3,10p' "$0" ;;
esac
