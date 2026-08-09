// Hosted Puck pages (site.md §1): render the block types the pure edition
// knows (Hero, Markdown); anything else degrades to a labeled note. The
// baas resolves localized siblings (slug@locale) server-side per ?locale.
// Markdown is no longer hand-rolled — <wa-markdown> renders full GFM; the
// content rides in as an inert <script type="text/markdown"> set via
// textContent, so hosted content can never be parsed as live HTML.
import { base } from "../config.js";
import { localeQuery } from "../api.js";

function markdownBlock(content) {
  const host = document.createElement("wa-markdown");
  const text = document.createElement("script");
  text.type = "text/markdown";
  text.textContent = content;
  host.append(text);
  return host;
}

function heroBlock(props) {
  const section = document.createElement("section");
  section.className = "s2-center";
  section.style.paddingBlock = "3rem";
  const h1 = document.createElement("h1");
  h1.className = "s2-hero-title";
  h1.textContent = props.heading ?? props.title ?? "";
  const p = document.createElement("p");
  p.className = "s2-quiet";
  p.style.fontSize = "1.15rem";
  p.textContent = props.text ?? props.subtitle ?? "";
  section.append(h1, p);
  return section;
}

const slug = new URLSearchParams(location.search).get("slug") ?? "home";
const response = await fetch(`${base}/pages/${slug}${localeQuery()}`);
const mount = document.getElementById("page");
if (!response.ok) {
  mount.innerHTML = '<p>Page not found. <a href="./index.html">Home</a></p>';
} else {
  const doc = await response.json();
  document.title = `${doc.title} — saastarter2`;
  const content = doc.data?.content ?? [];
  mount.replaceChildren(
    ...content.map((block) => {
      if (block.type === "Markdown") return markdownBlock(block.props?.content ?? "");
      if (block.type === "Hero") return heroBlock(block.props ?? {});
      const note = document.createElement("p");
      note.className = "s2-quiet s2-small";
      note.textContent = `[${block.type} block]`;
      return note;
    }),
  );
  if (!mount.hasChildNodes()) mount.innerHTML = `<h1>${doc.title}</h1>`;
}
