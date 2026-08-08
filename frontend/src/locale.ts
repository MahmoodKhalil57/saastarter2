/**
 * Content locale (cms/localization.md): the baas resolves localized fields
 * server-side per `?locale=` — the SPA just remembers a choice, sends it,
 * and flips direction for RTL locales. Matches site.locales in
 * ../hono-aep-baas-config/project.cms.json.
 */
export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
const KEY = "locale";
const RTL = new Set(["ar", "he", "fa", "ur"]);

export const getLocale = (): Locale => {
  const stored = localStorage.getItem(KEY);
  return LOCALES.includes(stored as Locale) ? (stored as Locale) : "en";
};

export function applyLocale(): void {
  const locale = getLocale();
  document.documentElement.lang = locale;
  document.documentElement.dir = RTL.has(locale) ? "rtl" : "ltr";
}

export function setLocale(locale: Locale): void {
  localStorage.setItem(KEY, locale);
  location.reload(); // data refetches carry the new ?locale=
}

/** Query-string fragment every content fetch appends. */
export const localeQuery = (joiner: "?" | "&" = "?"): string => `${joiner}locale=${getLocale()}`;
