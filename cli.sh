#!/usr/bin/env bash
# saastarter2/cli.sh — the one entry for every maintenance loop.
#   ./cli.sh sync [diff|push|pull|fmt]     config repo → baas
#   ./cli.sh seed [diff|push|pull|fmt]     data repo → baas
#   ./cli.sh secrets [list|set N|delete N] per-project secrets
#   ./cli.sh validate                      both repos vs hosted $schemas
#   ./cli.sh fmt [check]                   prettier every non-git-ignored file
#   ./cli.sh add SPEC [--as ALIAS]         pin an npm / gh: module into every import map
#   ./cli.sh remove ALIAS                  drop a pin
#   ./cli.sh serve                         the site (docs/) on :8899
#   ./cli.sh ci [secrets|status]           creds → repo secrets; CI sync status
#   ./cli.sh audit [URL]                   navigation jank: CLS, long frames, view transitions
#   ./cli.sh css-flatten                   re-inline the vendored CSS tree (after a version bump)
#   ./cli.sh wa-bundle                     rebuild the eager component bundle (after a version bump)
#   ./cli.sh publish                       git push — Pages serves master:/docs directly
#   ./cli.sh init PROJECT_ID [SITE_URL]    re-point a fresh clone at YOUR project
# Keys come from .owner-creds.json, secret values from platform-creds.json.
set -euo pipefail
cd "$(dirname "$0")"

# Pinned: 1.0.0 on npm still looks for the UNDOTTED platform-creds.json,
# so an unpinned bunx silently fails to find this repo's .platform-creds.json.
BAAS_CLI_VERSION="${BAAS_CLI_VERSION:-1.0.2}"

baas() { # the suite checkout when developing the platform, npm otherwise
  if [ -f ../customPackages/hono-aep-baas-cli/bin/baas.ts ]; then
    bun ../customPackages/hono-aep-baas-cli/bin/baas.ts "$@"
  else
    bunx "hono-aep-baas-cli@${BAAS_CLI_VERSION}" "$@"
  fi
}

case "${1:-help}" in
  sync)     shift; baas sync  "${@:-diff}" --dir hono-aep-baas-config ;;
  seed)     shift; baas seed  "${@:-diff}" --dir hono-aep-baas-idempotent-seed ;;
  secrets)  shift; baas secrets "${@:-list}" --dir hono-aep-baas-config ;;
  validate) baas validate --dir hono-aep-baas-config
            baas validate --dir hono-aep-baas-idempotent-seed ;;
  fmt)      # prettier over everything git doesn't ignore, minus .prettierignore
            # (generated *.gen.js; config/seed dirs — `sync fmt`/`seed fmt` own those)
            mode=--write; [ "${2:-}" = check ] && mode=--check
            bunx prettier@3.9.6 "$mode" --ignore-path .gitignore --ignore-path .prettierignore --log-level warn . ;;
  add|remove) exec bun tools/importmap.ts "$@" ;;
  css-flatten) exec bun tools/flatten-css.ts ;;
  wa-bundle)  cd component-factory && exec bun run wa-bundle ;;
  audit)    shift # measures what a screenshot can't: per-navigation CLS with
            # the element that moved, long animation frames, whether a
            # cross-document view transition actually ran, prerender status.
            exec env NODE_PATH="$(npm root -g 2>/dev/null):$HOME/.npm/_npx/31e32ef8478fbf80/node_modules" \
              node tools/nav-audit.mjs "$@" ;;
  ci)       shift # GitHub Actions plumbing (.github/workflows/baas-sync.yml)
            case "${1:-help}" in
              secrets) # creds → repo secrets, so CI can push config + seed
                for f in .owner-creds.json .platform-creds.json; do
                  [ -f "$f" ] || { echo "missing $f — fill it in before pushing secrets"; exit 1; }
                done
                # A placeholder creds file uploads fine and then fails every
                # workflow run at the first API call — check before, not after.
                bun -e '
                  const owner = JSON.parse(await Bun.file(".owner-creds.json").text());
                  const usable = owner.sk_key || (owner.email && owner.password);
                  if (!usable) { console.error("✗ .owner-creds.json has no sk_key and no email+password"); process.exit(1); }
                  if (!owner.project) console.warn("⚠ .owner-creds.json has no project id — the CLI may fall back to baas.json");
                '
                gh secret set BAAS_OWNER_CREDS < .owner-creds.json
                gh secret set BAAS_PLATFORM_CREDS < .platform-creds.json
                echo "pushed BAAS_OWNER_CREDS + BAAS_PLATFORM_CREDS to $(gh repo view --json nameWithOwner -q .nameWithOwner)"
                echo "note: repo secrets are NOT exposed to workflows from forked PRs — the sync job runs on push to master only." ;;
              status)
                gh secret list
                echo "---"
                gh run list --workflow=baas-sync.yml --limit 5 2>/dev/null || echo "(no runs yet)" ;;
              *) echo "usage: ./cli.sh ci [secrets|status]" ; exit 1 ;;
            esac ;;
  serve)    exec bun -e 'Bun.serve({ port: 8899, hostname: "0.0.0.0", fetch(r) {
              const p = new URL(r.url).pathname.replace(/\/$/, "/index.html");
              return new Response(Bun.file("docs" + p));
            }}); console.log("serving docs/ at http://localhost:8899")' ;;
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
  publish)  git push origin master ;; # Pages serves master:/docs — pushing IS publishing
  *)        sed -n '3,17p' "$0" ;;
esac
