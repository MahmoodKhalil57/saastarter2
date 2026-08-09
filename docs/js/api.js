// Moved to a package: hono-aep-baas-client (pinned as `baas/` in every
// page's import map). This shim keeps the local seam — page code still
// imports "./api.js", and you can wrap or override any export here
// without touching a single page.
export * from "baas/api.js";
