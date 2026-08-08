/**
 * The ONE file a beginner edits. Everything else reads from here.
 */
export const config = {
  /** Your mizan-gpp API origin. */
  endpoint: "https://mizan-gpp.the-montiapple.workers.dev",
  /** Your project id (hono-aep-baas-config/baas.json `project`). */
  project: "saastarter2-shop",
  /** The contact form's publishable key (`sync pull` writes it into
   *  ../hono-aep-baas-config/forms/contact.cms.json — paste it here). */
  contactFormKey: "pk_live_907e9aff68c2482a8d6df97ce8ba6cbc77fef85a5a8e48e68b60f7288dc37577",
  /**
   * GitHub Pages base path: "/<repo>" for project pages, "" for a user
   * site or custom domain. Dev always serves at "/" — detection is
   * automatic at runtime.
   */
  basename: "/saastarter2",
};

/** Runtime basename: works at "/" (dev) AND under the Pages base path. */
export const runtimeBasename = (): string =>
  window.location.pathname === config.basename ||
  window.location.pathname.startsWith(`${config.basename}/`)
    ? config.basename
    : "";
