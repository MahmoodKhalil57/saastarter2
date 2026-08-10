#!/usr/bin/env bun
// Flatten a CDN stylesheet's @import tree into ONE committed file.
//
// Web Awesome's stylesheet is a tree of ~15 tiny @imports (37KB total).
// Bytes are irrelevant; the cost is that each one is a separate
// render-blocking request, and nested @imports are invisible to the
// preload scanner. Linking every leaf by hand made them parallel but kept
// 15 requests on the critical path.
//
// So: fetch the tree once, inline it in order, commit the result. Same
// deal as component-factory — the build happens here, never on the site.
// Cascade @layer order is preserved because inlining preserves @import
// order, which is what defines it.
//
//   ./cli.sh css-flatten            # regenerate after bumping the pin
import { dirname, resolve as resolvePath } from "node:path";

const ENTRY =
  process.argv[2] ?? "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.11.0/dist-cdn/styles/webawesome.css";
const OUT = process.argv[3] ?? new URL("../docs/css/webawesome.flat.gen.css", import.meta.url).pathname;

// Skip the utility layer: this site uses no wa-* utility classes, and it
// is the largest subtree. Re-add if that ever changes.
const SKIP = [/\/styles\/utilities\.css$/];

const IMPORT = /@import\s+url\(\s*(['"]?)([^'")]+)\1\s*\)\s*;?/g;
const seen = new Set<string>();
let requests = 0;

async function inline(url: string, depth = 0): Promise<string> {
  if (seen.has(url)) return `/* already inlined: ${url} */\n`;
  if (SKIP.some((re) => re.test(url))) return `/* skipped (unused): ${url} */\n`;
  seen.add(url);
  requests++;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  const css = await response.text();

  const parts: string[] = [];
  let cursor = 0;
  for (const match of css.matchAll(IMPORT)) {
    parts.push(css.slice(cursor, match.index));
    const child = new URL(match[2], url).href;
    parts.push(`/* ── ${child.split("/dist-cdn/").pop() ?? child} */\n`);
    parts.push(await inline(child, depth + 1));
    cursor = match.index + match[0].length;
  }
  parts.push(css.slice(cursor));
  return parts.join("");
}

const body = await inline(ENTRY);
const banner = `/* GENERATED — do not edit. Flattened from:
   ${ENTRY}
   ${requests} source file(s) inlined in @import order (cascade layers preserved).
   Regenerate after changing the pinned version:  ./cli.sh css-flatten
*/\n`;
await Bun.write(OUT, banner + body);
console.log(
  `${OUT.split("/").pop()}  ${(banner.length + body.length) / 1024 > 0 ? ((banner.length + body.length) / 1024).toFixed(1) : 0} KB  from ${requests} request(s) → 1`,
);
