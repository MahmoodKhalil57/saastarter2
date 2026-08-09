---
name: hono-aep-design-embed
description: Take a deliverable made with Claude Design (decks, documents, animations, 3D scenes, diagrams, fliers, prototypes) and land it in a no-build static site — export the files into the repo, then embed by isolation, integration, or flattening. Covers the constraint that Design URLs cannot be hotlinked, the four embed strategies and their costs, retheming onto the site's tokens, and the weight traps. Use when a task involves Claude Design output reaching a real website.
---

# Getting Claude Design output onto a static site

Claude Design (the `/design` skill and its `mcp__claude-design__*` tools)
produces real HTML deliverables — slide decks, documents, animations, 3D
scenes, diagrams, fliers, high-fidelity prototypes — inside a
filesystem-backed project. This skill covers the second half: getting one
of those onto a **no-build static site** that you actually deploy.

Two separate jobs, in order. Do not blur them.

1. **Make it** — in Claude Design, following its own prompt and skills
   (`get_claude_design_prompt` first; `read_design_skill` for
   `hifi-design` or `frontend-design`). That is where design decisions
   live: aesthetic direction, layout, type, motion.
2. **Land it** — export the files into the repo and choose an embed
   strategy. That is this skill. It makes **no design decisions**.

## The constraint everything follows from

A Claude Design project is not a hosting surface for your site:

- **`serve_url`** (`*.claudeusercontent.com`) is short-lived and carries a
  project-scoped token. Never put it in a page, a file, a commit, or any
  user-facing text. It will expire, and it is a credential.
- **`open_url`** (`claude.ai/design/…`) is the durable *editor* link. It
  is permissioned and it is not an embed target.

So: **you cannot iframe a live Design project into a public website.**
Embedding always means **copying the files into your repo** and serving
them yourself. That is a feature — the deployed site keeps working when
the Design project moves, changes, or has its sharing revoked.

## Export: Design project → repo

```
list_files(project_id, depth: -1)      → see the whole tree
read_file(project_id, path)            → per file (body is entity-escaped:
                                          decode &amp; &lt; &gt;)
```

Then write them under a directory you own, e.g. `docs/design/<slug>/`.

**Take only the deliverable and what it references.** Skip project
internals: `.thumbnail`, `scraps/*.napkin`, `_ds_bundle.js`,
`_ds_manifest.json`, `_adherence.*`, and any `preview/` or `source/`
folder that belongs to a design system rather than the artifact.

**Follow the artifact's own relative references.** A typical deliverable
is `thing.html` + `shared.css` + `shared.js` + `assets/*.svg`, all
relative — they must land with the same relative layout or the page
breaks. Grep the HTML for `href=`/`src=` and copy what it names.

**`.dc.html` needs its runtime.** Files ending `.dc.html` are Design
Components: they load `./support.js` and will not render without it.
Export `support.js` from the same directory alongside them. If you do not
need the Design editor's click-to-edit, a plain `.html` deliverable is
the simpler thing to embed — ask for that when the artifact is being
made.

## Four ways to embed, and what each costs

Pick by how much the artifact needs to *belong* to the page.

| Strategy | Do it when | Cost |
| --- | --- | --- |
| **Isolate** — copy files, `<iframe>` them | decks, animations, 3D, prototypes, anything with its own layout, fonts and scripts | separate document: its content is invisible to the host page's SEO, selection and in-page search; you own sizing |
| **Integrate** — lift the markup into a page or component, retheme onto site tokens | a section, hero, diagram or card that must feel native | manual retheming; the artifact's own token names will not match the site's |
| **Flatten** — export to a static asset (SVG/PNG) | diagrams, fliers, anything with no interaction | loses text selection and a11y unless it is SVG with real `<text>`; cheapest possible runtime |
| **Link** — a normal page in the site, linked to | a full deck or document that deserves its own URL | none, but it is not "embedded" — be honest about which one the user asked for |

Isolation is the safe default for anything that arrived with its own
`<style>`, fonts and scripts. Integration is the right call only when you
are prepared to rewrite its colors and type onto the site's tokens.

## Retheming, when you integrate

Design artifacts arrive with their own token vocabulary (`--bg-2`,
`--fg-3`, `--rule`, `--accent`, `--serif`, `--mono`) that has nothing to
do with the host site's. Two honest options:

- **Map it.** Add a small block that defines the artifact's variables in
  terms of the site's (`--rule: var(--s2-line)` and so on). Cheap,
  reversible, and it makes the artifact follow the site's theme and dark
  mode automatically.
- **Adopt the site's tokens.** Rewrite the markup's colors and type to
  the site vocabulary directly. More work, cleaner result, correct when
  the artifact is becoming a permanent part of the site.

Do not leave two competing palettes in one document and hope. That is how
a page ends up with three greys and two accent colors.

## Weight traps

Check before you embed, not after:

- **Inline-JSX prototypes ship Babel standalone** (~2 MB) plus React
  UMD builds, because they transpile in the browser. Fine for a design
  preview; unacceptable on a production page. Either have the artifact
  remade without inline JSX, flatten it, or accept it behind a lazy
  iframe that only loads on interaction.
- **Google Fonts** in the artifact's head add third-party requests and a
  second type system. Prefer mapping to fonts the site already loads.
- **A deck's stage script** (`deck-stage.js`) auto-scales via
  `transform`, which is exactly what you want inside a fixed-aspect
  iframe — do not fight it with your own scaling.
- **Never animate offscreen.** If the artifact animates, gate the iframe
  behind an `IntersectionObserver` so it starts when visible, and honor
  `prefers-reduced-motion` — see the frontend skill's motion ladder.

## Landing it well on a no-build site

The host page is plain HTML, so the embed is plain HTML too. Reserve the
box so the artifact never shifts layout, and lazy-load it:

```html
<iframe
  src="./design/quarterly-deck/index.html"
  title="Quarterly deck"
  loading="lazy"
  style="inline-size: 100%; aspect-ratio: 16 / 9; border: 0"
></iframe>
```

`aspect-ratio` + `inline-size` keeps it responsive and RTL-safe with no
JS. If you need more (deferred load on scroll, a poster frame, fullscreen)
that is a small custom element — write it in the site's component
directory rather than reaching for a library.

Same-origin (the files are yours now) means no CSP or X-Frame-Options
fight, and the parent page can talk to it via `postMessage` if it must.

## Checklist before you call it done

- [ ] Deliverable and every file it references copied; internals skipped
- [ ] No `*.claudeusercontent.com` URL anywhere in the repo
- [ ] Opens standalone from the site's own server (not just in Design)
- [ ] Box reserved (`aspect-ratio` or explicit size) — no layout shift
- [ ] `prefers-reduced-motion` respected if it animates
- [ ] Weight checked: no browser-side transpiler shipped to production
- [ ] The Design project link (`open_url`) given to the **user**, and
      recorded in a comment or README — not as a runtime dependency

## What this skill will not do

It will not choose the artifact's aesthetic, layout, palette, or motion
language — those belong to Claude Design and to whoever is directing the
design. This skill only moves the result across the boundary and tells
you what that costs.
