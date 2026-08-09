// The lazily-loaded React engine — fetched from the CDN (pins live in the
// page import maps: react, react-dom/client, htm) the FIRST time any
// react-jit component connects, then shared by all of them. Pages with no
// react-jit components never pay a byte of React.
//
// What a component factory receives:
//   React     — the React namespace (hooks live here)
//   html      — htm bound to createElement: JSX-shaped tagged templates,
//               no compiler ("html`<div>${x}</div>`")
//   useStore  — subscribe a nanostores atom from #stores inside a component
let enginePromise = null;

export function loadEngine() {
  return (enginePromise ??= (async () => {
    const [reactModule, domClient, htmModule] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("htm"),
    ]);
    const React = reactModule.default ?? reactModule;
    const html = (htmModule.default ?? htmModule).bind(React.createElement);
    function useStore(store) {
      const subscribe = React.useCallback((cb) => store.listen(cb), [store]);
      const getSnapshot = React.useCallback(() => store.get(), [store]);
      return React.useSyncExternalStore(subscribe, getSnapshot);
    }
    return { React, createRoot: domClient.createRoot, html, useStore };
  })());
}
