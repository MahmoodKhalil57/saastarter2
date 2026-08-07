/**
 * The ONE file a beginner edits. Everything else reads from here.
 */
export const config = {
  /** Your mizan-gpp API origin. */
  endpoint: "http://localhost:3000",
  /** Your project id (hono-aep-baas-config/baas.json `project`). */
  project: "saastarter2",
  /** The contact form's publishable key (`sync pull` writes it into
   *  ../hono-aep-baas-config/forms/contact.cms.json — paste it here). */
  contactFormKey: "pk_live_PASTE_FROM_SYNC_PULL",
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
