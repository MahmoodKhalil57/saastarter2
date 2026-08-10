// Entry for the eager Web Awesome bundle.
//
// Only components that CANNOT be plain HTML belong here. Cards, buttons
// and badges used to be in this list; they are now .s2-card / .s2-btn /
// .s2-tag, which render from the HTML with no JavaScript at all — the
// whole point of tier 1. What remains is wa-input, because s2-search
// extends it and the login/account forms use its behavior.
//
// The re-export is load-bearing: a custom element name can only be
// defined once per page, so anything subclassing a Web Awesome component
// must take its base class from here rather than fetching a second copy
// from the CDN (that throws and takes the subclass's module down with it).
export { default as WaInput } from "@awesome.me/webawesome/dist/components/input/input.js";
