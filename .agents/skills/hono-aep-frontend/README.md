# hono-aep-frontend-skill

The agent skill for **no-build hono-aep static sites** (the saastarter2
class): an inventory of the mechanisms the architecture makes cheap —
component tiers across five engines, one shared state layer, dependency
pinning without a bundler, a motion capability ladder, MPA navigation,
in-browser editing — with the measured cost of each.

Install into a site repo:

```sh
npx skills add MahmoodKhalil57/hono-aep-frontend-skill
```

## What it is for

Agents working in these repos otherwise reinvent things that already
exist (a bundler step that isn't needed, a state channel that forks the
atoms, a 182KB React artifact to render a button) or avoid capabilities
they don't know are wired up.

## What it deliberately does not do

It contains **no design guidance**. No palette, no type scale, no layout
opinions, no motion language, no "components should look like this". The
architecture assists paths a premium design application tends to need;
it does not choose the destination, and neither does this skill. Every
mechanism it documents is optional, and it ships a "what you can delete"
table so removing unused infrastructure is as legible as adopting it.

## Companion skill

[`hono-aep-baas-client`](https://github.com/MahmoodKhalil57/hono-aep-baas)
covers the backend side: the public `/v1` contract, config/seed
workflows, and when to escalate a gap as a platform issue.

## Contents

| file | covers |
| --- | --- |
| `SKILL.md` | the capability map, the two silent-failure invariants, tier selection, what is safe to delete |
| `references/component-tiers.md` | the six ways to put a component on the page, with measured weights and the `wrap` workflow for third-party and headless libraries |
| `references/motion-ladder.md` | tiers 0–4 from CSS to HTML-in-Canvas, capability detection, fallback design |
