# Motion — a capability ladder, not a library

There is no single right animation stack. "Optimized" means **using the
cheapest tier that achieves the effect, and degrading predictably when
the device or the user says no.** This file describes the tiers and the
signals for choosing between them. It does not prescribe a motion
language — timing, easing and taste are design decisions.

## The ladder

| Tier | Mechanism | Reach for it when |
| --- | --- | --- |
| **0** | no motion — final state immediately | reduced-motion, save-data, or a device that failed the frame budget |
| **1** | CSS transitions, `@view-transition`, scroll-driven `animation-timeline: view()/scroll()`, `@starting-style`, `transition-behavior: allow-discrete` | almost everything. Zero JS, runs on the compositor |
| **2** | Web Animations API, or a small engine (Motion mini, Anime.js v4 ~17KB) | you need sequencing or values CSS can't express |
| **3** | GSAP (~23KB gzip core) + ScrollTrigger | real choreography: timelines, pinning, scrubbing, SVG morphing |
| **4** | HTML-in-Canvas + WebGL/WebGPU shaders, driven by a tier-3 timeline | effects the DOM cannot produce: refraction, displacement, per-pixel warps, dissolve-to-particles — on live, interactive content |

Climbing a tier should be a decision with a reason. Tier 1 covers the
overwhelming majority of interface motion and costs nothing.

## Tier 1 is bigger than people expect

- **Cross-document View Transitions** already animate between pages here
  (`@view-transition { navigation: auto }`); matching
  `view-transition-name`s morph across a real navigation.
- **Scroll-driven animations** (`animation-timeline: view()`) run
  scroll-linked motion off the main thread with no JS and no observer.
  ~83% global support; the fallback is simply "no animation", which is a
  safe degradation.
- `@starting-style` + `allow-discrete` animate entry/exit including
  `display`, which used to require JS.

## Tier 4: HTML-in-Canvas

Status as of 2026: **origin trial in Chrome 148–150**, also behind
`chrome://flags/#canvas-draw-element`. Not generally available, Chromium
only — a fallback is mandatory, not optional.

Surface: `drawElement`, the `layoutsubtree` attribute,
`texElementImage2D()` (upload an element's rendering as a WebGL texture),
`captureElementImage()` (snapshot, transferable to a worker /
OffscreenCanvas), `getElementTransform()`, and a `paint` event that fires
when children change.

What makes it interesting rather than a gimmick: the DOM stays **live** —
links, form controls, text selection, focus and assistive-technology
access survive, because you are drawing real elements rather than an
image of them. That is the difference from html2canvas-era tricks.

**Pairing.** GSAP is the natural driver: it tweens arbitrary numeric
values (shader uniforms), not just DOM properties, and ScrollTrigger's
scrub maps directly onto effect progress. Motion's main advantage is
WAAPI offloading, which cannot touch a uniform, so that advantage does
not apply at this tier. Anime.js v4 is a lighter substitute for the same
role.

**Detection** — feature-detect the method, never the user agent:

```js
const canvasHtml =
  typeof CanvasRenderingContext2D !== "undefined" &&
  "drawElement" in CanvasRenderingContext2D.prototype;
```

## The design move that makes fallback free

Keep the tween engine separate from the render target. Animate a plain
state object; give it two appliers:

```js
const state = { progress: 0 };
// tier 4: applier writes state.progress into a shader uniform
// tier 1-3: applier writes it to a CSS custom property / transform
```

Same animation definition, different applier. Losing HTML-in-Canvas then
degrades to a CSS transition instead of breaking, and you can test both
paths without rewriting the animation.

## Deciding what a device can take

Static hints are a gate, not a verdict — they are wrong in both
directions:

```js
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const saveData = navigator.connection?.saveData === true;
const weak = (navigator.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4;
```

The honest signal is **measured**: sample frame time for the first few
hundred milliseconds of an effect and drop a tier if it cannot hold
budget. A mid-range phone that renders tier 4 fine should get it; a
"powerful" laptop with thermal throttling should not.

Two rules that matter more than tier choice:

- **Never animate offscreen.** `content-visibility: auto` plus an
  `IntersectionObserver` gate is the largest free win available.
- **`prefers-reduced-motion: reduce` means tier 0**, not "tier 1 but
  slower". Jump to the final state. It is an accessibility signal, and
  for some users it is a medical one.

## Adding an engine

Nothing above tier 1 is pinned by default — 23KB should not be mandatory
for a site whose motion is three transitions:

```bash
./cli.sh add gsap
./cli.sh add animejs        # lighter alternative
```

Then `import gsap from "gsap"` like any other pinned module. Remove it
with `./cli.sh remove gsap` when the effect that justified it is gone.
