// Powered by the Iconify ecosystem: the official <iconify-icon> web
// component (loaded from CDN in every page head) resolves ANY of 200k+
// icons by name at runtime — fetched once from the Iconify API, cached by
// the component. No generator, no build; change a name and refresh.
// Static HTML can use <iconify-icon icon="lucide:x"> tags directly; JS
// templates go through this helper for consistent classing.
export function icon(name, cls = "") {
  const full = name.includes(":") ? name : `lucide:${name}`;
  return `<iconify-icon icon="${full}" class="icon ${cls}" inline></iconify-icon>`;
}
