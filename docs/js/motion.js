// Motion capability detection — answers "how much can this user and this
// device take?" and then gets out of the way. Deliberately NOT an
// animation engine: nothing here tweens anything. Pick a tier, then use
// whatever is cheapest at that tier (CSS for 1, an engine you pinned
// yourself for 2-3, canvas/WebGL for 4).
//
// Tiers (see the hono-aep-frontend skill's motion-ladder reference):
//   0  no motion — jump to the final state
//   1  CSS transitions / scroll-driven animations / view transitions
//   2  WAAPI or a small JS engine
//   3  a full timeline engine (GSAP et al — opt-in, not pinned here)
//   4  HTML-in-Canvas + WebGL, driven by a tier-3 timeline
//
// Delete this file if your site's motion never leaves tier 1. That is the
// common case and it needs no detection at all.

/** Accessibility signal, not a preference — for some users it is medical. */
export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The user asked the OS/browser to spend less. Respect it. */
export const prefersSaveData = () => navigator.connection?.saveData === true;

/** Static hints. Wrong in both directions — a gate, never a verdict. */
export const looksLowSpec = () => (navigator.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4;

/** Feature-detect the API, never the user agent. Origin-trial/flag-gated today. */
export const supportsHtmlInCanvas = () =>
  typeof CanvasRenderingContext2D !== "undefined" && "drawElement" in CanvasRenderingContext2D.prototype;

/**
 * Measure what the device actually does, rather than what it claims.
 * Resolves to frames-per-second observed over `ms`. A thermally throttled
 * flagship reports the same deviceMemory as a cool one; only the frame
 * clock knows the difference.
 */
export function measureFps(ms = 400) {
  return new Promise((resolve) => {
    let frames = 0;
    const started = performance.now();
    const tick = (now) => {
      frames += 1;
      if (now - started >= ms) resolve(Math.round((frames * 1000) / (now - started)));
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/**
 * Resolve the tier to run at. Cheap gates first (they are decisive and
 * instant); the frame probe only runs when something above tier 1 is
 * still on the table, because measuring costs a few hundred ms.
 *
 *   const tier = await resolveTier({ max: 4 });
 */
export async function resolveTier({ max = 4, probe = true, minFps = 50 } = {}) {
  if (prefersReducedMotion()) return 0;
  if (prefersSaveData()) return Math.min(max, 1);

  let tier = max;
  if (tier >= 4 && !supportsHtmlInCanvas()) tier = 3;
  if (looksLowSpec()) tier = Math.min(tier, 1);
  if (tier <= 1 || !probe) return tier;

  const fps = await measureFps();
  return fps < minFps ? Math.min(tier, 1) : tier;
}

/** Re-resolve when the user flips reduced-motion mid-session. */
export function onReducedMotionChange(callback) {
  const query = matchMedia("(prefers-reduced-motion: reduce)");
  const handler = () => callback(query.matches);
  query.addEventListener("change", handler);
  return () => query.removeEventListener("change", handler);
}

/**
 * Run `start` only once the element is actually near the viewport, and
 * stop when it leaves. Offscreen animation is the most common waste there
 * is, and skipping it costs nothing.
 */
export function whenVisible(element, start, { rootMargin = "200px" } = {}) {
  let stop;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !stop) stop = start() ?? (() => {});
        else if (!entry.isIntersecting && stop) {
          stop();
          stop = undefined;
        }
      }
    },
    { rootMargin },
  );
  observer.observe(element);
  return () => {
    observer.disconnect();
    stop?.();
  };
}
