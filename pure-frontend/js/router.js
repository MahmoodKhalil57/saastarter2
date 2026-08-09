// SvelteKit-style client navigation for the MPA: intercept same-origin
// link clicks, fetch the target page, and swap ONLY <main> (+ title) —
// the navbar, footer, cart drawer, and every shared module persist, so
// nothing re-renders that didn't change. Page-scoped module scripts
// re-run against the fresh DOM (cache-busted import; ui.js is skipped —
// it is the persistent chrome). Any doubt → hard navigation fallback.
const parser = new DOMParser();
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

async function render(url, push) {
  const response = await fetch(url).catch(() => null);
  if (!response?.ok) return void (location.href = url);
  const doc = parser.parseFromString(await response.text(), "text/html");
  const nextMain = doc.querySelector("main");
  if (!nextMain || !document.querySelector("main")) return void (location.href = url);

  const apply = () => {
    document.title = doc.title;
    document.querySelector("main").replaceWith(nextMain);
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
  };

  // Frozen-root view transition: NO fade — the old content holds until the
  // swap lands; only elements with matching view-transition-names morph.
  if (document.startViewTransition && !reduced) await document.startViewTransition(apply).updateCallbackDone;
  else apply();

  if (push) {
    history.replaceState({ y: scrollY }, "", location.href); // remember where we were
    history.pushState({ y: 0 }, "", url);
    scrollTo(0, 0);
  }
  if (new URL(url, location.href).hash) {
    dispatchEvent(new HashChangeEvent("hashchange")); // e.g. #cart opens the drawer
  }
}

addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = event.target.closest?.("a[href]");
  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || anchor.hasAttribute("data-no-spa")) return;
  const href = anchor.getAttribute("href");
  if (href.startsWith("#")) return; // same-page hash (e.g. the cart drawer)
  if (anchor.origin !== location.origin) return; // studio/admin/Stripe stay full navigations
  if (anchor.pathname.endsWith("/admin.html")) return; // meta-refresh stub
  event.preventDefault();
  void render(anchor.href, true);
});

addEventListener("popstate", (event) => {
  void render(location.href, false).then(() => scrollTo(0, event.state?.y ?? 0));
});
