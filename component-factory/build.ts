// The one-time build: framework sources → self-registering custom-element
// artifacts at docs/js/components/*.gen.js. Run `bun run build` here; the
// site never runs this. Artifact contract (docs/js/components/README.md):
// framework runtime bundled IN, `#stores` + `nanostores` left EXTERNAL so
// every artifact shares the site's atom instances via the page import map.
import { mkdir, rm } from "node:fs/promises";
import type { BunPlugin } from "bun";
import { compile as svelteCompile } from "svelte/compiler";
import { parse as vueParse, compileTemplate as vueCompileTemplate } from "vue/compiler-sfc";

const ROOT = import.meta.dir;
const OUT = `${ROOT}/../docs/js/components`;
const TMP = `${ROOT}/.tmp`;
await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });

// `#stores` and `nanostores` resolve at RUNTIME through the page import
// map — bundling them would fork the atoms into per-artifact copies.
const siteExternals: BunPlugin = {
  name: "site-externals",
  setup(build) {
    build.onResolve({ filter: /^(#stores|nanostores)$/ }, (args) => ({ path: args.path, external: true }));
  },
};

async function bundle(entry: string, name: string, provenance: string) {
  const result = await Bun.build({
    entrypoints: [entry],
    target: "browser",
    minify: true,
    plugins: [siteExternals],
    define: {
      "process.env.NODE_ENV": '"production"',
      // Vue's compile-time feature flags (harmless for other frameworks)
      __VUE_OPTIONS_API__: "true",
      __VUE_PROD_DEVTOOLS__: "false",
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false",
    },
  });
  if (!result.success) {
    console.error(result.logs.join("\n"));
    throw new Error(`build failed: ${name}`);
  }
  const code = await result.outputs[0].text();
  const banner = `// GENERATED — do not edit. Source: component-factory/${provenance} · rebuild: cd component-factory && bun run build\n`;
  await Bun.write(`${OUT}/${name}.gen.js`, banner + code);
  console.log(`${name}.gen.js\t${(code.length / 1024).toFixed(1)} KB`);
}

// --- lit + react: Bun bundles (and transpiles JSX) natively -------------
await bundle(`${ROOT}/lit/counter-lit.js`, "counter-lit", "lit/counter-lit.js");
await bundle(`${ROOT}/react/counter-react.tsx`, "counter-react", "react/counter-react.tsx");

// --- svelte: compiler emits a custom element, then bundle ---------------
{
  const source = await Bun.file(`${ROOT}/svelte/counter-svelte.svelte`).text();
  const { js } = svelteCompile(source, { customElement: true, runes: true, filename: "counter-svelte.svelte" });
  const tmp = `${TMP}/counter-svelte.js`;
  await Bun.write(tmp, js.code);
  await bundle(tmp, "counter-svelte", "svelte/counter-svelte.svelte");
}

// --- vue: SFC → options object + compiled render fn → defineCustomElement
{
  const source = await Bun.file(`${ROOT}/vue/counter-vue.vue`).text();
  const { descriptor } = vueParse(source, { filename: "counter-vue.vue" });
  if (!descriptor.script || !descriptor.template) throw new Error("counter-vue.vue needs <script> + <template>");
  const script = descriptor.script.content.replace(/export\s+default/, "const __sfc__ =");
  const template = vueCompileTemplate({
    source: descriptor.template.content,
    filename: "counter-vue.vue",
    id: "s2-counter-vue",
    compilerOptions: { isCustomElement: (tag: string) => tag.includes("-") },
  });
  const assembled = [
    script,
    template.code, // exports `render`, imports runtime helpers from "vue"
    "__sfc__.render = render;",
    'import { defineCustomElement as __dce__ } from "vue";',
    'if (!customElements.get("s2-counter-vue")) customElements.define("s2-counter-vue", __dce__(__sfc__, { shadowRoot: false }));',
  ].join("\n");
  const tmp = `${TMP}/counter-vue.js`;
  await Bun.write(tmp, assembled);
  await bundle(tmp, "counter-vue", "vue/counter-vue.vue");
}
