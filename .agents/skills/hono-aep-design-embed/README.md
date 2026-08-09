# hono-aep-design-embed-skill

The agent skill for taking **Claude Design** output — decks, documents,
animations, 3D scenes, diagrams, fliers, hi-fi prototypes — and landing
it on a **no-build static site**.

```sh
npx skills add MahmoodKhalil57/hono-aep-design-embed-skill
```

## Why it exists

Claude Design produces real HTML deliverables in a filesystem-backed
project. Getting one onto a site you actually deploy has exactly one
correct shape, and it is not the obvious one:

- `serve_url` is short-lived and carries a project-scoped token — it is a
  credential, not a hosting URL.
- `open_url` is the durable *editor* link — permissioned, not an embed
  target.

**So a live Design project cannot be iframed into a public site.**
Embedding means exporting the files into your repo and serving them
yourself. This skill covers that export, the four embed strategies
(isolate / integrate / flatten / link) with their costs, retheming onto
the host site's tokens, and the weight traps — chiefly that inline-JSX
prototypes ship a ~2 MB browser-side transpiler.

## What it deliberately does not do

No design guidance. Aesthetic direction, layout, type and motion belong
to Claude Design and to whoever is directing the design — this skill only
moves the finished result across the boundary and states what that costs.

## Companion skills

- [`hono-aep-frontend`](https://github.com/MahmoodKhalil57/hono-aep-frontend-skill)
  — the mechanisms a no-build hono-aep site makes cheap, including the
  motion ladder an embedded animation should respect.
- [`hono-aep-baas-client`](https://github.com/MahmoodKhalil57/hono-aep-baas)
  — the backend `/v1` contract.

## Contents

| file | covers |
| --- | --- |
| `SKILL.md` | the hotlinking constraint, export outline, the four embed strategies, retheming, weight traps, done-checklist |
| `references/export-recipe.md` | exact tool sequence, what to skip, proving it renders from your own server, lazy-embed snippet, re-export flow, per-format landing table |
