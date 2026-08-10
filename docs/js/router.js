// Same-document navigation: MORPH the page instead of replacing it.
//
// Cross-document View Transitions animate between two documents, but the
// old document is still destroyed and the new one rebuilt — so the nav,
// the cart drawer and every registered component are torn down and
// re-created on every hop. Measured on this site: `wa-button` does not
// upgrade until ~144ms AFTER first contentful paint, so a full-document
// swap reveals a page whose components have not upgraded yet, and they
// pop in afterwards. That pop is the blink; no transition can hide it,
// because it happens after the transition ends.
//
// Morphing sidesteps the whole class of problem: idiomorph diffs the new
// <main> against the live one and patches only what differs. Identical
// structure is left alone — untouched nodes are never destroyed, so
// nothing re-registers, nothing re-upgrades, and nothing blinks. The
// chrome outside <main> is never even considered.
//
// The animation still comes from the platform: the DOM patch runs inside
// document.startViewTransition(), so matching view-transition-names morph
// exactly as they did cross-document.
//
// Progressive enhancement, in order:
//   Navigation API  → intercept() (correct history, scroll, focus for free)
//   click listener  → same behavior, manual history
//   neither         → plain MPA navigation, still correct
import { Idiomorph } from "idiomorph";

const parser = new DOMParser();
const canTransition = typeof document.startViewTransition === "function";

/** Should this navigation be handled in-document? */
function isInternal(url, target) {
  if (url.origin !== location.origin) return false; // studio/admin/Stripe stay real navigations
  if (url.pathname === location.pathname && url.hash) return false; // same-page anchor
  if (/\/admin(\.html)?$/.test(url.pathname)) return false; // meta-refresh stub
  if (target && target !== "_self") return false;
  // Clean URLs: pages are served extensionless (/products, not
  // /products.html). Treat anything without a file extension as a page,
  // and never intercept a real asset.
  const last = url.pathname.split("/").pop() ?? "";
  const ext = last.includes(".") ? last.slice(last.lastIndexOf(".")) : "";
  return ext === "" || ext === ".html";
}

async function swap(url) {
  const response = await fetch(url, { headers: { "X-Requested-With": "router" } }).catch(() => null);
  if (!response?.ok) throw new Error(`fetch failed: ${url}`);
  const doc = parser.parseFromString(await response.text(), "text/html");
  const nextMain = doc.querySelector("main");
  const currentMain = document.querySelector("main");
  if (!nextMain || !currentMain) throw new Error("no <main> to morph");

  const apply = () => {
    document.title = doc.title;
    // Only <main> is diffed. Everything outside it — nav, footer, the cart
    // drawer with its open state — is never touched by design.
    Idiomorph.morph(currentMain, nextMain);
    runPageScripts(doc, url);
  };

  if (canTransition) await document.startViewTransition(apply).updateCallbackDone;
  else apply();
}

// Page-scoped module scripts have to run again against the patched DOM.
// chrome.js is deliberately skipped: it is the persistent chrome and is
// already alive. Cache-busting the URL forces re-execution of top-level
// code (ES modules are evaluated once per URL).
function runPageScripts(doc, url) {
  for (const script of doc.querySelectorAll('script[type="module"]')) {
    const src = script.getAttribute("src") ?? "";
    if (src.endsWith("chrome.js")) continue;
    if (src) {
      void import(`${new URL(src, url)}?nav=${Date.now()}`).catch(() => {});
    } else {
      const inline = document.createElement("script");
      inline.type = "module";
      inline.textContent = script.textContent;
      document.body.append(inline);
      inline.remove();
    }
  }
}

if ("navigation" in window) {
  // The Navigation API owns history, scroll restoration and focus reset —
  // all the things a hand-rolled router gets subtly wrong.
  navigation.addEventListener("navigate", (event) => {
    if (!event.canIntercept || event.hashChange || event.downloadRequest !== null) return;
    if (event.formData) return;
    const url = new URL(event.destination.url);
    if (!isInternal(url)) return;
    event.intercept({
      scroll: "after-transition",
      async handler() {
        await swap(url).catch(() => {
          location.href = url; // any doubt → let the browser do it properly
        });
      },
    });
  });
} else {
  addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest?.("a[href]");
    if (!anchor || anchor.hasAttribute("download") || anchor.hasAttribute("data-no-router")) return;
    const url = new URL(anchor.href, location.href);
    if (!isInternal(url, anchor.target)) return;
    event.preventDefault();
    swap(url).then(
      () => {
        history.pushState({}, "", url);
        scrollTo(0, 0);
      },
      () => {
        location.href = url;
      },
    );
  });
  addEventListener("popstate", () => void swap(new URL(location.href)).catch(() => location.reload()));
}

// Warm the cache on hover so the click-time fetch is already in flight.
const prefetched = new Set();
addEventListener("pointerover", (event) => {
  const anchor = event.target.closest?.("a[href]");
  if (!anchor) return;
  const url = new URL(anchor.href, location.href);
  if (!isInternal(url, anchor.target) || prefetched.has(url.href)) return;
  prefetched.add(url.href);
  void fetch(url, { priority: "low" }).catch(() => {});
});
