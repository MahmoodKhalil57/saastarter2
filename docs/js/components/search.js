// <s2-search> (tier 2: extend) — Web Awesome's input, subclassed. The
// class comes from the page's single Web Awesome instance (#wa-core); we inherit the shadow template, form association, and theme
// styling, and add the one thing the library doesn't ship: a debounced,
// bubbling `s2-search` event with the trimmed query in `detail.query`.
// From the eager bundle, never the CDN: a second copy of the module
// would try to define "wa-input" again, throw, and take this file with it.
import { WaInput } from "#wa-core";

class S2Search extends WaInput {
  #timer;
  connectedCallback() {
    super.connectedCallback();
    if (!this.type || this.type === "text") this.type = "search";
    this.addEventListener("input", () => {
      clearTimeout(this.#timer);
      this.#timer = setTimeout(
        () => {
          this.dispatchEvent(
            new CustomEvent("s2-search", {
              detail: { query: (this.value ?? "").trim() },
              bubbles: true,
            }),
          );
        },
        Number(this.getAttribute("delay") ?? 250),
      );
    });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.#timer);
  }
}

if (!customElements.get("s2-search")) customElements.define("s2-search", S2Search);
