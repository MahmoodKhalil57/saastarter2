#!/usr/bin/env bun
// The import-map pinner: `./cli.sh add <spec>` — resolve a version, write
// the pin into EVERY page's <script type="importmap">, done. This is the
// no-build answer to `npm install`: nothing is downloaded, nothing is
// bundled, the browser fetches the module from a CDN at a pinned version.
//
//   ./cli.sh add nanostores                 → esm.sh, latest version pinned
//   ./cli.sh add nanostores@1.4.2           → that exact version
//   ./cli.sh add gh:owner/repo --as thing/  → jsDelivr /gh at the latest tag
//   ./cli.sh add gh:owner/repo@v2/src/      → that exact tag, subpath prefix
//   ./cli.sh remove thing/
//   ./cli.sh add --list
//
// Prefix mappings (trailing slash) let you import many files from one pin:
//   "wa/": "…/dist-cdn/"  →  import "wa/components/input/input.js"
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const PAGES_DIR = join(import.meta.dir, "..", "docs");
const OPEN = '<script type="importmap">';
const CLOSE = "</script>";

type Pin = { alias: string; url: string };

async function latestNpmVersion(pkg: string): Promise<string> {
  const response = await fetch(`https://registry.npmjs.org/${pkg}/latest`);
  if (!response.ok) throw new Error(`npm: ${pkg} not found (${response.status})`);
  return (await response.json()).version;
}

async function latestGhTag(repo: string): Promise<string> {
  const response = await fetch(`https://api.github.com/repos/${repo}/tags`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`github: ${repo} tags unreadable (${response.status})`);
  const tags = await response.json();
  if (!tags.length) throw new Error(`github: ${repo} has no tags — pin a tag, never a branch`);
  return tags[0].name;
}

/** "gh:owner/repo@v1/src/" | "pkg@1.2.3/sub" | "@scope/pkg@1" → a pin. */
async function resolve(spec: string, aliasOverride?: string): Promise<Pin> {
  // A local file gets aliased verbatim — that's how `#stores`-style seams
  // are declared (a bare specifier the whole page agrees on, so every
  // module and every compiled artifact resolves to ONE instance).
  if (spec.startsWith("./") || spec.startsWith("/")) {
    if (!aliasOverride) throw new Error(`local specifier needs --as <alias>: ${spec}`);
    return { alias: aliasOverride, url: spec };
  }
  if (spec.startsWith("gh:")) {
    const rest = spec.slice(3);
    const match = rest.match(/^([^/]+\/[^/@]+)(?:@([^/]+))?(\/.*)?$/);
    if (!match) throw new Error(`bad gh spec: ${spec} (want gh:owner/repo[@tag][/subpath])`);
    const [, repo, tag, subpath = ""] = match;
    const version = tag ?? (await latestGhTag(repo));
    const url = `https://cdn.jsdelivr.net/gh/${repo}@${version}${subpath}`;
    const alias = aliasOverride ?? (subpath.endsWith("/") ? `${repo.split("/")[1]}/` : repo.split("/")[1]);
    return { alias, url };
  }
  // npm: [@scope/]name[@version][/subpath]
  const scoped = spec.startsWith("@");
  const body = scoped ? spec.slice(1) : spec;
  const at = body.indexOf("@");
  const name = (scoped ? "@" : "") + (at === -1 ? body : body.slice(0, at));
  const tail = at === -1 ? "" : body.slice(at + 1);
  const [version = await latestNpmVersion(name), ...subParts] = tail ? tail.split("/") : [];
  const subpath = subParts.length ? `/${subParts.join("/")}` : "";
  const url = `https://esm.sh/${name}@${version}${subpath}?target=es2022`;
  return { alias: aliasOverride ?? `${name}${subpath}`, url };
}

async function pages(): Promise<string[]> {
  const files = await readdir(PAGES_DIR);
  const withMap: string[] = [];
  for (const file of files.filter((f) => f.endsWith(".html"))) {
    const path = join(PAGES_DIR, file);
    if ((await Bun.file(path).text()).includes(OPEN)) withMap.push(path);
  }
  return withMap;
}

function editMap(html: string, mutate: (imports: Record<string, string>) => void): string {
  const start = html.indexOf(OPEN);
  if (start === -1) return html;
  const bodyStart = start + OPEN.length;
  const bodyEnd = html.indexOf(CLOSE, bodyStart);
  const map = JSON.parse(html.slice(bodyStart, bodyEnd));
  map.imports ??= {};
  mutate(map.imports);
  // longest-specifier-first is how the browser matches; keep it readable
  map.imports = Object.fromEntries(Object.entries(map.imports).sort(([a], [b]) => a.localeCompare(b)));
  return html.slice(0, bodyStart) + "\n" + JSON.stringify(map, null, 2) + "\n" + html.slice(bodyEnd);
}

async function applyToAllPages(mutate: (imports: Record<string, string>) => void) {
  const targets = await pages();
  for (const path of targets) {
    const before = await Bun.file(path).text();
    const after = editMap(before, mutate);
    if (after !== before) await Bun.write(path, after);
  }
  return targets.length;
}

const [command, spec] = process.argv.slice(2);
const flag = (name: string) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
};

if (command === "add" && process.argv.includes("--list")) {
  const first = (await pages())[0];
  const html = await Bun.file(first).text();
  const map = JSON.parse(html.slice(html.indexOf(OPEN) + OPEN.length, html.indexOf(CLOSE, html.indexOf(OPEN))));
  for (const [alias, url] of Object.entries(map.imports ?? {})) console.log(`${alias}\t${url}`);
} else if (command === "add") {
  if (!spec) throw new Error("usage: ./cli.sh add <npm-pkg[@version]|gh:owner/repo[@tag][/path]> [--as alias]");
  const pin = await resolve(spec, flag("as"));
  const count = await applyToAllPages((imports) => {
    imports[pin.alias] = pin.url;
  });
  console.log(`pinned  ${pin.alias}  →  ${pin.url}`);
  console.log(`updated ${count} page(s). Import it as: import … from "${pin.alias}"`);
} else if (command === "remove") {
  if (!spec) throw new Error("usage: ./cli.sh remove <alias>");
  const count = await applyToAllPages((imports) => {
    delete imports[spec];
  });
  console.log(`removed ${spec} from ${count} page(s)`);
} else {
  console.log(`usage:
  ./cli.sh add <spec> [--as alias]   pin an npm or GitHub module into every page's import map
  ./cli.sh add --list                show the current map
  ./cli.sh remove <alias>            drop a pin

specs:
  nanostores            latest npm version, pinned exactly
  nanostores@1.4.2      that version
  gh:owner/repo         latest GitHub TAG (never a branch — jsDelivr caches immutably)
  gh:owner/repo@v1/src/ that tag, prefix mapping for a whole directory`);
  process.exit(command ? 1 : 0);
}
