// Entry for the eager Web Awesome bundle: the components that appear above
// the fold on most pages. Importing their modules registers the tags.
//
// It also RE-EXPORTS the classes, and that is not incidental. A custom
// element name can only be defined once per page. If a subclass imports
// its base from the CDN while this bundle has already defined the same
// tag from node_modules, the second define() throws and takes the
// subclass's whole module down with it. So anything extending a Web
// Awesome component must get its base class from here — one instance,
// one registration. (Same rule as #stores: shared globals need a single
// module instance, and the failure is silent-ish either way.)
import "@awesome.me/webawesome/dist/components/card/card.js";
import "@awesome.me/webawesome/dist/components/badge/badge.js";
export { default as WaButton } from "@awesome.me/webawesome/dist/components/button/button.js";
export { default as WaInput } from "@awesome.me/webawesome/dist/components/input/input.js";
