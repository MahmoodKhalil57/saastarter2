#!/usr/bin/env node
// Pre-JS vs post-JS layout diff.
//
// CLS only counts movement that happens *after* a paint. Content that JS
// injects before the first paint never registers as a shift, yet the page
// still lays out differently than the HTML alone describes — and on a slow
// device that difference IS visible, because the pre-JS layout is what the
// user looks at while the scripts arrive.
//
// So render each page twice — once with JavaScript disabled, once with it
// enabled and settled — and diff the geometry of every element that exists
// in both. Anything that moves is a box the HTML failed to reserve.
//
//   node tools/nojs-diff.mjs [baseUrl] [--pages a.html,b.html]
import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright-core");

function findChromium() {
  const root = join(homedir(), ".cache", "ms-playwright");
  const builds = readdirSync(root)
    .filter((n) => /^chromium-\d+$/.test(n))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const b of builds) {
    for (const d of ["chrome-linux64", "chrome-linux"]) {
      try {
        readdirSync(join(root, b, d));
        return join(root, b, d, "chrome");
      } catch {}
    }
  }
}

const args = process.argv.slice(2);
const base = (args.find((a) => a.startsWith("http")) ?? "https://mahmoodkhalil57.github.io/saastarter2/").replace(
  /\/?$/,
  "/",
);
const pagesFlag = args.indexOf("--pages");
const pages = (pagesFlag === -1 ? "index.html,products.html,blog.html,contact.html,login.html" : args[pagesFlag + 1])
  .split(",")
  .filter(Boolean);

// Runs in the page. Builds a stable structural path for every element so
// the two renders can be compared even though JS adds nodes.
const capture = () => {
  const path = (el) => {
    const parts = [];
    for (let node = el; node && node.nodeType === 1 && node !== document.documentElement; node = node.parentElement) {
      const tag = node.tagName.toLowerCase();
      const sameTag = [...(node.parentElement?.children ?? [])].filter((c) => c.tagName === node.tagName);
      parts.unshift(sameTag.length > 1 ? `${tag}[${sameTag.indexOf(node)}]` : tag);
    }
    return parts.join(">");
  };
  const out = {};
  for (const el of document.querySelectorAll("body *")) {
    // Placeholders are MEANT to be replaced once data arrives; counting
    // them as movement would mean the tool can never read zero.
    if (el.closest("[data-placeholder]")) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    out[path(el)] = [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height)];
  }
  return { boxes: out, docHeight: Math.round(document.documentElement.scrollHeight) };
};

const browser = await chromium.launch({ executablePath: findChromium(), args: ["--no-sandbox"] });
const viewport = { width: 1440, height: 900 };

async function snapshot(url, js) {
  const ctx = await browser.newContext({ viewport, javaScriptEnabled: js });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: js ? "load" : "domcontentloaded" });
  // Wait for webfonts in BOTH renders. Otherwise the no-JS snapshot is
  // taken pre-swap and the diff blames JS for font reflow. (Playwright's
  // evaluate runs in an isolated world, so this works with JS disabled.)
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  // CSS animations run WITHOUT JS too (the hero reveal does), so a short
  // no-JS wait catches them mid-flight and the diff blames JS for it.
  await page
    .evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))))
    .catch(() => {});
  await page.waitForTimeout(js ? 2000 : 400); // components upgrade + data lands
  const result = await page.evaluate(capture);
  await ctx.close();
  return result;
}

let worstOverall = 0;
for (const name of pages) {
  const url = base + name;
  const before = await snapshot(url, false);
  const after = await snapshot(url, true);

  const moved = [];
  for (const [key, a] of Object.entries(before.boxes)) {
    const b = after.boxes[key];
    if (!b) {
      moved.push({ key, why: "disappeared", delta: a[3] });
      continue;
    }
    const dy = b[1] - a[1];
    const dh = b[3] - a[3];
    if (Math.abs(dy) >= 2 || Math.abs(dh) >= 2)
      moved.push({
        key,
        why: `y${dy >= 0 ? "+" : ""}${dy} h${dh >= 0 ? "+" : ""}${dh}`,
        delta: Math.abs(dy) + Math.abs(dh),
      });
  }
  moved.sort((x, y) => y.delta - x.delta);
  worstOverall = Math.max(worstOverall, moved.length);

  const heightDelta = after.docHeight - before.docHeight;
  console.log(`\n${name}  —  ${moved.length} element(s) move between pre-JS and post-JS`);
  console.log(
    `  document height: ${before.docHeight} → ${after.docHeight}  (${heightDelta >= 0 ? "+" : ""}${heightDelta}px)`,
  );
  for (const m of moved.slice(0, 8)) console.log(`    ${m.why.padEnd(16)} ${m.key.slice(-72)}`);
  if (moved.length > 8) console.log(`    … and ${moved.length - 8} more`);
}

await browser.close();
console.log(
  `\n${worstOverall === 0 ? "✓ no pre-JS/post-JS movement anywhere" : "aim: reserve the boxes above so both renders agree"}\n`,
);
