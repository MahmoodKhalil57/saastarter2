// SvelteKit-style client navigation for the MPA: intercept same-origin
// link clicks, fetch the target page, and MORPH <main> — idiomorph diffs
// the old and new trees and patches only what actually differs, so
// identical structure (headers, containers, grid shells) is left alone;
// nothing is removed-and-recreated. The navbar, footer, cart drawer and
// every shared module persist untouched. Page-scoped module scripts
// re-run cache-busted against the patched DOM (ui.js is skipped — it is
// the persistent chrome); hovering a link prefetches its HTML so the
// swap is warm. Any doubt → hard navigation fallback.
import { Idiomorph } from "./vendor/idiomorph.esm.js";

const parser = new DOMParser();

async function render(url, push) {
  const response = await fetch(url).catch(() => null);
  if (!response?.ok) return void (location.href = url);
  const doc = parser.parseFromString(await response.text(), "text/html");
  const nextMain = doc.querySelector("main");
  const currentMain = document.querySelector("main");
  if (!nextMain || !currentMain) return void (location.href = url);

  if (push) {
    history.replaceState({ y: scrollY }, "", location.href); // remember where we were
    scrollTo(0, 0); // BEFORE the morph — a scrolled-down user never sees the swap mid-page
  }
  document.title = doc.title;
  Idiomorph.morph(currentMain, nextMain); // diff + patch; unchanged nodes untouched

  for (const script of doc.querySelectorAll('script[type="module"]')) {
    const src = script.getAttribute("src") ?? "";
    if (src.endsWith("ui.js")) continue; // persistent chrome, already alive
    if (src) void import(`${new URL(src, url)}?spa=${Date.now()}`); // re-run top-level against the new DOM
    else {
      const inline = document.createElement("script");
      inline.type = "module";
      inline.textContent = script.textContent;
      document.body.appendChild(inline);
    }
  }

  if (push) history.pushState({ y: 0 }, "", url);
  if (new URL(url, location.href).hash) {
    dispatchEvent(new HashChangeEvent("hashchange")); // e.g. #cart opens the drawer
  }
}

const spaLink = (anchor) => {
  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || anchor.hasAttribute("data-no-spa")) return null;
  const href = anchor.getAttribute("href") ?? "";
  if (href.startsWith("#")) return null; // same-page hash (e.g. the cart drawer)
  if (anchor.origin !== location.origin) return null; // studio/admin/Stripe stay full navigations
  if (anchor.pathname.endsWith("/admin.html")) return null; // meta-refresh stub
  return anchor;
};

addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = spaLink(event.target.closest?.("a[href]"));
  if (!anchor) return;
  event.preventDefault();
  void render(anchor.href, true);
});

// Warm the HTTP cache on hover — the click-time fetch is then instant.
const prefetched = new Set();
addEventListener("pointerover", (event) => {
  const anchor = spaLink(event.target.closest?.("a[href]"));
  if (!anchor || prefetched.has(anchor.href)) return;
  prefetched.add(anchor.href);
  void fetch(anchor.href, { priority: "low" }).catch(() => {});
});

addEventListener("popstate", (event) => {
  void render(location.href, false).then(() => scrollTo(0, event.state?.y ?? 0));
});
