// Bundle the eager Web Awesome components into one same-origin file.
// Four separate CDN module fetches cost +298ms FCP / +610ms LCP on slow
// 4G (measured); one bundle from our own already-connected origin does
// not. Build-once and committed, like the other .gen artifacts.
const out = await Bun.build({
  entrypoints: ["./wa-core.entry.js"],
  target: "browser",
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
});
if (!out.success) {
  console.error(out.logs.join("\n"));
  process.exit(1);
}
const code = await out.outputs[0].text();
const banner = `// GENERATED — do not edit. Eager Web Awesome components (see
// wa-core.entry.js) bundled so they define at first paint instead of
// after the autoloader discovers the tags.
// Regenerate after bumping the Web Awesome pin:  ./cli.sh wa-bundle
`;
await Bun.write("../docs/js/wa-core.gen.js", banner + code);
console.log(`wa-core.gen.js  ${(code.length / 1024).toFixed(1)} KB  (4 CDN requests → 1 local)`);
