// Edit-this-page → commit. No build step means the file IS the DOM, so in
// edit mode anything that can mutate the DOM — you, DevTools, a Claude
// browser extension — is editing the source. Review the line diff, push, and
// GitHub Pages serves the new commit. Loaded by ui.js only when a developer
// has saved a token on dev.html; visitors never fetch this file.
import { changedCount, diffLines, mergeToSource, renderDiff } from "./devgit-diff.js";
import { getFile, loadConfig, putFile, targets } from "./devgit-github.js";

const cfg = loadConfig();
const MARK = "data-s2devgit";
const state = { editing: false, files: [] }; // files[i] matches targets(cfg)[i]

const el = (tag, className, html) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  node.setAttribute(MARK, "");
  return node;
};

const style = el("style", "", `
  .s2-devgit-fab{position:fixed;bottom:1rem;left:1rem;z-index:2000;font-family:monospace}
  .s2-devgit-panel{position:fixed;bottom:4rem;left:1rem;z-index:2000;width:min(34rem,calc(100vw - 2rem));max-height:70vh;overflow:auto}
  .s2-devgit-diff{font-size:.75rem;line-height:1.5;background:var(--bs-tertiary-bg);padding:.5rem;border-radius:.375rem;max-height:14rem;overflow:auto}
  .s2-devgit-add{color:var(--bs-success)}.s2-devgit-del{color:var(--bs-danger)}.s2-devgit-fold{opacity:.5}
  [contenteditable="true"]:focus-visible{outline:2px dashed var(--bs-primary);outline-offset:2px}`);
const fab = el("button", "btn btn-dark shadow s2-devgit-fab", "&lt;/&gt;");
const panel = el("div", "card shadow s2-devgit-panel d-none");
panel.setAttribute("contenteditable", "false");
fab.addEventListener("click", () => panel.classList.toggle("d-none"));

function paint(html) {
  panel.innerHTML = `<div class="card-body vstack gap-2"><div class="d-flex justify-content-between"><strong class="s2-mono">devgit</strong><span class="badge text-bg-${state.editing ? "warning" : "secondary"}">${state.editing ? "editing" : "live"}</span></div>${html}</div>`;
  panel.classList.remove("d-none");
}

const status = (message, ok = true) => { const box = panel.querySelector("[data-status]"); if (box) box.innerHTML = `<div class="alert alert-${ok ? "info" : "danger"} py-1 px-2 small mb-0">${message}</div>`; };

function paintHome() {
  paint(`<p class="small text-body-secondary mb-0">Freeze this page, edit the DOM (by hand, DevTools, or a browser agent), then commit the diff straight to GitHub. Configure on <a href="./dev.html">dev.html</a>.</p>
    <div data-status></div><button class="btn btn-warning btn-sm" data-edit>Edit this page</button>`);
  panel.querySelector("[data-edit]").addEventListener("click", () => enterEdit().catch((error) => status(error.message, false)));
}

// Swap the live DOM for the pristine repo file: scripts come in inert (they
// were parsed by DOMParser), so nothing re-injects nav/cart — DOM ≡ file.
async function enterEdit() {
  status("fetching source from GitHub…");
  state.files = await Promise.all(targets(cfg).map((t) => getFile(cfg, t.branch, t.path).catch(() => null)));
  if (!state.files[0]) throw new Error(`${targets(cfg)[0].label} not found in repo`);
  const doc = new DOMParser().parseFromString(state.files[0].text, "text/html");
  document.replaceChild(document.adoptNode(doc.documentElement), document.documentElement);
  document.body.setAttribute("contenteditable", "true");
  state.editing = true;
  document.body.append(style, fab, panel);
  paintEditing();
}

function paintEditing() {
  paint(`<p class="small text-body-secondary mb-0">Page frozen to <code>${targets(cfg)[0].label}</code> — scripts are inert, the DOM is the file. Click into the page to type, or let an agent rewrite it.</p>
    <div data-diff></div><input class="form-control form-control-sm" data-message placeholder="commit message"><div data-status></div>
    <div class="hstack gap-2"><button class="btn btn-outline-secondary btn-sm" data-review>Review diff</button><button class="btn btn-primary btn-sm" data-push>Commit &amp; push</button><button class="btn btn-outline-danger btn-sm ms-auto" data-discard>Discard</button></div>`);
  panel.querySelector("[data-review]").addEventListener("click", review);
  panel.querySelector("[data-push]").addEventListener("click", () => push().catch((error) => status(error.message, false)));
  panel.querySelector("[data-discard]").addEventListener("click", () => location.reload());
}

// The committed text is the serialized DOM minus devgit's own UI.
export function serializePage() {
  const clone = document.documentElement.cloneNode(true);
  clone.querySelectorAll(`[${MARK}]`).forEach((node) => node.remove());
  clone.querySelector("body")?.removeAttribute("contenteditable");
  return `<!doctype html>\n${clone.outerHTML}\n`;
}

// The commit text: DOM serialization with untouched regions re-anchored to
// the file's original bytes (see mergeToSource) — the diff is only the edit.
const committedText = () => mergeToSource(state.files[0].text, serializeBaseline(), serializePage());

function review() {
  const ops = diffLines(state.files[0].text, committedText());
  const count = changedCount(ops);
  const box = panel.querySelector("[data-diff]");
  box.replaceChildren(renderDiff(ops));
  status(count ? `${count} changed line${count === 1 ? "" : "s"}` : "no changes yet");
  return count;
}

async function push(message) {
  const edited = committedText();
  if (edited === state.files[0].text) { status("no changes to commit"); return; }
  message ||= panel.querySelector("[data-message]")?.value || `devgit: edit ${targets(cfg)[0].path.split("/").pop()} in the browser`;
  const links = [];
  for (const [index, target] of targets(cfg).entries()) {
    status(`pushing ${target.label}…`);
    const commit = await putFile(cfg, target.branch, target.path, edited, message, state.files[index]?.sha);
    links.push(`<a href="${commit.html_url}" target="_blank" rel="noreferrer">${target.label}</a>`);
  }
  status(`committed → ${links.join(" · ")} — <a href="#" onclick="location.reload();return false">reload</a>`);
}

// What the browser makes of the untouched file — parser normalization (rare
// in this hand-written, well-formed HTML) shouldn't read as "changes".
let baseline;
function serializeBaseline() {
  if (baseline === undefined) {
    const doc = new DOMParser().parseFromString(state.files[0].text, "text/html");
    baseline = `<!doctype html>\n${doc.documentElement.outerHTML}\n`;
  }
  return baseline;
}

if (cfg?.token) {
  document.body.append(style, fab, panel);
  paintHome();
  panel.classList.add("d-none");
  // Console/agent hook: s2devgit.enterEdit() → mutate DOM → s2devgit.push("msg")
  window.s2devgit = { enterEdit, serializePage, review, push };
}
