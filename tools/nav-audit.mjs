#!/usr/bin/env node
// Navigation jank audit — measures what a screenshot cannot.
//
// The problem with "take a screenshot mid-navigation" is that the jerk
// lasts a few frames and you cannot time the capture. So don't capture:
// let the browser report. Every document gets probes installed BEFORE its
// own scripts run (addInitScript), and each one ships its findings out
// over an exposed binding before the document is destroyed. What comes
// back is deterministic and repeatable:
//
//   • CLS per navigation, and the ELEMENT that shifted (layout-shift
//     entries carry `sources` — the node, plus its rect before and after)
//   • FCP / LCP per document
//   • whether a cross-document View Transition actually ran (pageswap /
//     pagereveal), rather than assuming the CSS took effect
//   • whether the page was prerendered by the speculation rules
//   • long animation frames (the actual definition of jank)
//   • which custom elements are still un-upgraded AT first paint, and how
//     long after it each one takes to define — the "buttons and cards
//     render half-finished" problem, measured instead of eyeballed
//
// Usage:
//   node tools/nav-audit.mjs [baseUrl] [--runs 3] [--headed]
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright-core"));
} catch {
  console.error("playwright-core not found. Try: npx --package playwright-core node tools/nav-audit.mjs");
  process.exit(1);
}

const args = process.argv.slice(2);
const base = (args.find((a) => a.startsWith("http")) ?? "https://mahmoodkhalil57.github.io/saastarter2/").replace(
  /\/?$/,
  "/",
);
const runsFlag = args.indexOf("--runs");
const runs = (runsFlag === -1 ? 0 : Number(args[runsFlag + 1])) || 1;
const headed = args.includes("--headed");
// How long to hover before clicking (prerender needs a moment to be useful).
const dwellFlag = args.indexOf("--dwell");
const dwellMs = (dwellFlag === -1 ? 0 : Number(args[dwellFlag + 1])) || 700;

// The probe runs in EVERY document, before any page script. It cannot
// rely on anything the page provides.
const probe = () => {
  const report = {
    url: location.pathname.split("/").pop() || "index.html",
    cls: 0,
    shifts: [],
    fcp: null,
    lcp: null,
    longFrames: [],
    viewTransition: { swapFired: false, revealFired: false, hadActiveTransition: false },
    prerendered: false,
    domInteractive: null,
    undefinedAtFcp: [],
    defines: {},
  };
  const describe = (node) => {
    if (!node || node.nodeType !== 1) return "(anonymous)";
    const id = node.id ? `#${node.id}` : "";
    const cls = typeof node.className === "string" && node.className ? `.${node.className.trim().split(/\s+/)[0]}` : "";
    return `${node.tagName.toLowerCase()}${id}${cls}`;
  };

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue; // user-initiated shifts don't count
        report.cls += entry.value;
        for (const source of entry.sources ?? []) {
          report.shifts.push({
            value: Number(entry.value.toFixed(5)),
            element: describe(source.node),
            from: source.previousRect ? `${Math.round(source.previousRect.y)}px` : "?",
            to: source.currentRect ? `${Math.round(source.currentRect.y)}px` : "?",
          });
        }
      }
    }).observe({ type: "layout-shift", buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name !== "first-contentful-paint" || report.fcp !== null) continue;
        report.fcp = Math.round(entry.startTime);
        // A custom element still :not(:defined) here is one the user sees
        // half-rendered. Sampling at FCP is what makes this deterministic.
        const undefinedNow = [...document.querySelectorAll(":not(:defined)")].map((el) => el.tagName.toLowerCase());
        report.undefinedAtFcp = Object.entries(
          undefinedNow.reduce((counts, tag) => ({ ...counts, [tag]: (counts[tag] ?? 0) + 1 }), {}),
        );
      }
    }).observe({ type: "paint", buffered: true });

    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      report.lcp = Math.round(entries[entries.length - 1].startTime);
    }).observe({ type: "largest-contentful-paint", buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration >= 50) report.longFrames.push(Math.round(entry.duration));
      }
    }).observe({ type: "long-animation-frame", buffered: true });
  } catch (error) {
    report.observerError = String(error);
  }

  // Did a cross-document view transition actually run? These events fire
  // only when one does — much stronger evidence than "the CSS is present".
  addEventListener("pageswap", (event) => {
    report.viewTransition.swapFired = true;
    report.viewTransition.hadActiveTransition ||= Boolean(event.viewTransition);
    window.__navAuditSend?.(JSON.parse(JSON.stringify(report)));
  });
  addEventListener("pagereveal", (event) => {
    report.viewTransition.revealFired = true;
    report.viewTransition.hadActiveTransition ||= Boolean(event.viewTransition);
  });

  // When does each custom element on the page actually upgrade?
  const watchDefines = () => {
    const tags = new Set(
      [...document.querySelectorAll("*")].map((el) => el.tagName.toLowerCase()).filter((tag) => tag.includes("-")),
    );
    for (const tag of tags) {
      if (tag in report.defines) continue;
      report.defines[tag] = null;
      customElements.whenDefined(tag).then(() => {
        report.defines[tag] = Math.round(performance.now());
      });
    }
  };
  addEventListener("DOMContentLoaded", watchDefines);
  setTimeout(watchDefines, 0);

  addEventListener("load", () => {
    const nav = performance.getEntriesByType("navigation")[0];
    report.prerendered = Boolean(nav?.activationStart);
    report.domInteractive = Math.round(nav?.domInteractive ?? 0);
  });

  // Ship the final state out before this document dies.
  addEventListener("pagehide", () => window.__navAuditSend?.(JSON.parse(JSON.stringify(report))));
  window.__navAuditReport = () => JSON.parse(JSON.stringify(report));
};

// playwright-core pins a browser build it may not have downloaded here;
// use whatever full chromium is actually installed (the headless shell
// lacks the rendering paths view transitions need anyway).
import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function findChromium() {
  const root = join(homedir(), ".cache", "ms-playwright");
  try {
    const builds = readdirSync(root)
      .filter((name) => /^chromium-\d+$/.test(name))
      .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
    for (const build of builds) {
      for (const dir of ["chrome-linux64", "chrome-linux"]) {
        const candidate = join(root, build, dir, "chrome");
        try {
          readdirSync(join(root, build, dir));
          return candidate;
        } catch {}
      }
    }
  } catch {}
  return undefined;
}

const collected = [];
const browser = await chromium.launch({
  headless: !headed,
  executablePath: findChromium(),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.exposeFunction("__navAuditSend", (data) => collected.push(data));
await context.addInitScript(probe);

const page = await context.newPage();
const settle = async () => {
  await page.waitForLoadState("load");
  await page.waitForTimeout(1200); // let LCP/CLS settle; not a screenshot race
};

const hops = ["products.html", "blog.html", "index.html"];
for (let run = 0; run < runs; run++) {
  await page.goto(base + "index.html", { waitUntil: "load" });
  await settle();
  collected.push({ ...(await page.evaluate(() => window.__navAuditReport())), phase: "initial load" });

  for (const hop of hops) {
    // A REAL user navigation: click the link, don't call goto().
    const link = page.locator(`a[href$="${hop}"]`).first();
    if ((await link.count()) === 0) continue;
    // Hover first, and dwell. Speculation rules with eagerness:"moderate"
    // start prerendering on hover/pointerdown — clicking instantly (what a
    // naive script does) measures a path no real user takes and reports
    // prerender:false for the wrong reason.
    await link.hover();
    await page.waitForTimeout(dwellMs);
    await Promise.all([page.waitForURL(`**/${hop}`, { timeout: 15000 }).catch(() => {}), link.click()]);
    await settle();
    collected.push({ ...(await page.evaluate(() => window.__navAuditReport())), phase: `→ ${hop}` });
  }
}

await browser.close();

// --- report ---------------------------------------------------------------
const seen = new Set();
const rows = collected.filter((r) => {
  const key = `${r.phase}|${r.url}|${r.cls}`;
  if (!r.phase || seen.has(key)) return false;
  seen.add(key);
  return true;
});

console.log(`\nnavigation audit — ${base}\n`);
console.log(
  ["phase".padEnd(16), "CLS".padStart(7), "FCP".padStart(6), "LCP".padStart(6), "VT", "prerender", "longFrames"].join(
    "  ",
  ),
);
for (const row of rows) {
  console.log(
    [
      String(row.phase).padEnd(16),
      row.cls.toFixed(4).padStart(7),
      String(row.fcp ?? "-").padStart(6),
      String(row.lcp ?? "-").padStart(6),
      row.viewTransition.hadActiveTransition ? "yes" : row.viewTransition.revealFired ? "evt" : "no ",
      String(row.prerendered).padEnd(9),
      row.longFrames.length ? row.longFrames.join(",") : "-",
    ].join("  "),
  );
}

const worst = rows.flatMap((r) => r.shifts.map((s) => ({ ...s, phase: r.phase }))).sort((a, b) => b.value - a.value);
if (worst.length) {
  console.log("\nwhat actually moved (largest first):");
  for (const shift of worst.slice(0, 12)) {
    console.log(`  ${shift.value.toFixed(4)}  ${shift.phase.padEnd(14)} ${shift.element}  ${shift.from} → ${shift.to}`);
  }
} else {
  console.log("\nno layout shifts recorded.");
}

const first = rows[0];
if (first) {
  console.log("\ncomponent readiness on first load:");
  const stragglers = first.undefinedAtFcp ?? [];
  console.log(
    stragglers.length
      ? `  un-upgraded AT first paint: ${stragglers.map(([tag, n]) => `${n}x ${tag}`).join(", ")}`
      : "  un-upgraded at first paint: none",
  );
  const defines = Object.entries(first.defines ?? {}).sort((a, b) => (a[1] ?? Infinity) - (b[1] ?? Infinity));
  for (const [tag, at] of defines) {
    const delta =
      at != null && first.fcp != null ? `${at - first.fcp >= 0 ? "+" : ""}${at - first.fcp}ms after FCP` : "";
    console.log(`  ${tag.padEnd(18)} ${String(at ?? "never").padStart(6)}ms  ${delta}`);
  }
  console.log("  (a tag defining long after FCP renders half-finished for that long —");
  console.log("   import its module directly in the head instead of leaving it to a loader)");
}

const totalCls = rows.reduce((sum, r) => sum + r.cls, 0) / (rows.length || 1);
console.log(`\nmean CLS across ${rows.length} document(s): ${totalCls.toFixed(4)}  (good ≤ 0.1)\n`);
