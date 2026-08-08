import tailwind from "bun-plugin-tailwind";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { config } from "../src/config";

/**
 * The GitHub Pages build (baas/site.md §2a): hashed assets under the
 * configured base path, `404.html` as the SPA deep-link fallback, and
 * `.nojekyll` so Pages serves every asset. `bun run build` → dist/ is
 * the whole deployment.
 */

const out = new URL("../dist/", import.meta.url).pathname;
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const result = await Bun.build({
  entrypoints: [new URL("../index.html", import.meta.url).pathname],
  outdir: out,
  plugins: [tailwind],
  minify: true,
  naming: { chunk: "assets/[name]-[hash].[ext]", asset: "assets/[name]-[hash].[ext]" },
  // Asset URLs must resolve under the Pages base path ("" ≡ site root).
  publicPath: `${config.basename}/`,
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

// The manifest is a REIFIED artifact (sync artifacts → public/), so the
// bundler never sees it — the link is injected post-build, base-path'd.
for (const name of ["index.html"]) {
  const target = `${out}${name}`;
  const html = await Bun.file(target).text();
  await Bun.write(
    target,
    html.replace(
      "</head>",
      `<link rel="manifest" href="${config.basename}/manifest.webmanifest"></head>`,
    ),
  );
}

// Pages has no rewrites: 404.html IS the SPA shell, so deep links recover.
cpSync(`${out}index.html`, `${out}404.html`);
// Jekyll would eat underscore-prefixed asset paths — opt out.
await Bun.write(`${out}.nojekyll`, "");
// Static extras (icons, reified SEO/PWA artifacts once site.md §2 lands).
const publicDir = new URL("../public/", import.meta.url).pathname;
if (existsSync(publicDir)) cpSync(publicDir, out, { recursive: true });

console.log(`built → dist/ (base path "${config.basename || "/"}", 404.html + .nojekyll in place)`);
