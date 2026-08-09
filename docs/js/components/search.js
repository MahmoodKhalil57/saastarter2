// <s2-search> (tier 2: extend) — Web Awesome's input, subclassed. The
// class comes off the pinned CDN through the `wa/` import map in every
// page head; we inherit the shadow template, form association, and theme
// styling, and add the one thing the library doesn't ship: a debounced,
// bubbling `s2-search` event with the trimmed query in `detail.query`.
import WaInput from "wa/components/input/input.js";

class S2Search extends WaInput {
  #timer;
  connectedCallback() {
    super.connectedCallback();
    if (!this.type || this.type === "text") this.type = "search";
    this.addEventListener("input", () => {
      clearTimeout(this.#timer);
      this.#timer = setTimeout(() => {
        this.dispatchEvent(new CustomEvent("s2-search", {
          detail: { query: (this.value ?? "").trim() },
          bubbles: true,
        }));
      }, Number(this.getAttribute("delay") ?? 250));
    });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.#timer);
  }
}

if (!customElements.get("s2-search")) customElements.define("s2-search", S2Search);
