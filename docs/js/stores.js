// The page's ONE set of atoms. `#stores` maps here, and this module
// re-exports the shared atoms from hono-aep-baas-client — a re-export is
// not a copy, so site code, custom elements and compiled .gen.js
// artifacts all observe the same instances.
import { atom } from "nanostores";

export * from "baas/stores.js";

/** Site-local playground atom for the component lab (lab.html). */
export const $counter = atom(0);
