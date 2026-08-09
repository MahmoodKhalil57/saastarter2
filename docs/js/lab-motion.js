// lab.html only — the tier-4 proving ground.
//
// The point is not the effect; it is the SHAPE. One animated state value,
// two appliers. Tier 4 paints the live DOM into a canvas (HTML-in-Canvas)
// and can distort it per-pixel; tier 1 writes the same value to a CSS
// custom property and lets the compositor do a sweep. Same animation
// definition, different applier — so losing the API degrades instead of
// breaking, and both paths are testable.
//
// No animation engine is imported. A tier-4 effect does not require GSAP;
// pin one only when the choreography actually needs it.
import { onReducedMotionChange, resolveTier, supportsHtmlInCanvas, whenVisible } from "./motion.js";

const host = document.getElementById("motion-host");
const canvas = document.getElementById("motion-canvas");
const label = document.getElementById("motion-tier");
if (host) void init();

/** The one animated value every applier reads. */
const state = { progress: 0 };

/** Tier 1 — the compositor sweeps a mask; costs nothing, works everywhere. */
function cssApplier() {
  canvas?.classList.add("s2-hidden");
  host.classList.remove("s2-hidden");
  return () => host.style.setProperty("--progress", state.progress.toFixed(3));
}

/** Tier 4 — draw the LIVE element into a canvas and distort it per row. */
function canvasApplier() {
  const context = canvas.getContext("2d");
  const box = host.getBoundingClientRect();
  canvas.width = box.width * devicePixelRatio;
  canvas.height = box.height * devicePixelRatio;
  canvas.style.inlineSize = `${box.width}px`;
  canvas.style.blockSize = `${box.height}px`;
  canvas.classList.remove("s2-hidden");
  // The source element stays in the DOM (focusable, selectable, readable
  // by assistive tech); the canvas is what the eye sees.
  host.style.visibility = "hidden";
  return () => {
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    context.clearRect(0, 0, box.width, box.height);
    const amplitude = Math.sin(state.progress * Math.PI) * 14;
    for (let y = 0; y < box.height; y += 4) {
      const offset = Math.sin(y / 22 + state.progress * Math.PI * 2) * amplitude;
      context.save();
      context.beginPath();
      context.rect(0, y, box.width, 4);
      context.clip();
      context.translate(offset, 0);
      context.drawElement(host, 0, 0);
      context.restore();
    }
  };
}

async function init() {
  let tier = await resolveTier({ max: 4 });
  // This lab card only has two implementations; tiers 2-3 would use the
  // same state object with an engine you pinned, so collapse to tier 1.
  if (tier > 1 && tier < 4) tier = 1;

  const describe = () =>
    tier === 0
      ? "tier 0 — reduced motion: final state, no animation"
      : tier === 4
        ? "tier 4 — HTML-in-Canvas: the live DOM, distorted per row"
        : `tier 1 — CSS sweep${supportsHtmlInCanvas() ? "" : " (HTML-in-Canvas unavailable in this browser)"}`;
  if (label) label.textContent = describe();

  if (tier === 0) {
    host.style.setProperty("--progress", "1");
    return;
  }

  const apply = tier === 4 ? canvasApplier() : cssApplier();
  whenVisible(host, () => {
    let frame;
    const started = performance.now();
    const loop = (now) => {
      state.progress = ((now - started) / 2600) % 1;
      apply();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame); // stops the moment it scrolls away
  });
}

// A mid-session switch to reduced motion must take effect immediately.
onReducedMotionChange((reduced) => {
  if (!reduced) return;
  host.style.setProperty("--progress", "1");
  location.reload();
});
