export const LOCALES = [
  { code: "ru", label: "Русский", short: "RU" },
  { code: "en", label: "English", short: "EN" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: Locale = "ru";

export function isLocale(value: string): value is Locale {
  return LOCALES.some((l) => l.code === value);
}

/** "/en/account" → "/account", "/en" → "/" */
export function stripLocale(pathname: string): string {
  const match = pathname.match(/^\/(ru|en)(?=\/|$)/);
  if (!match) return pathname || "/";
  return pathname.slice(match[0].length) || "/";
}

/** Русский — без префикса, остальные — /{locale}/… */
export function localizePath(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return path;
  if (path === "/") return `/${locale}`;
  if (path.startsWith("/#")) return `/${locale}${path.slice(1)}`;
  return `/${locale}${path}`;
}
