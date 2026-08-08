// Hosted Puck pages (site.md §1): render the block types the pure edition
// knows (Hero, Markdown); anything else degrades to a labeled note. The
// baas resolves localized siblings (slug@locale) server-side per ?locale.
import { base } from "../config.js";
import { localeQuery } from "../api.js";

/** Mini-markdown: headings, bold, italics, links, code, paragraphs. */
function md(text) {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return esc.split(/\n{2,}/).map((block) => {
    const h = block.match(/^(#{1,3})\s+(.*)$/m);
    let html = block
      .replace(/^#{1,3}\s+.*$/m, "")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .trim();
    const heading = h ? `<h${h[1].length + 1}>${h[2]}</h${h[1].length + 1}>` : "";
    return heading + (html ? `<p>${html.replace(/\n/g, "<br>")}</p>` : "");
  }).join("");
}

const BLOCKS = {
  Markdown: (props) => `<div class="mb-4">${md(props.content ?? "")}</div>`,
  Hero: (props) => `<section class="text-center py-5"><h1 class="display-4 fw-bold">${props.heading ?? props.title ?? ""}</h1><p class="lead text-body-secondary">${props.text ?? props.subtitle ?? ""}</p></section>`,
};

const slug = new URLSearchParams(location.search).get("slug") ?? "home";
const response = await fetch(`${base}/pages/${slug}${localeQuery()}`);
const mount = document.getElementById("page");
if (!response.ok) {
  mount.innerHTML = '<p>Page not found. <a href="./index.html">Home</a></p>';
} else {
  const doc = await response.json();
  document.title = `${doc.title} — saastarter2`;
  const content = doc.data?.content ?? [];
  mount.innerHTML = content.map((block) =>
    BLOCKS[block.type]
      ? BLOCKS[block.type](block.props ?? {})
      : `<p class="text-body-tertiary small">[${block.type} block]</p>`,
  ).join("") || `<h1>${doc.title}</h1>`;
}
