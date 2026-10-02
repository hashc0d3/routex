import { safeStorage } from "./storage";

const KEY = "routex.consent.v1";

/** Выбор в cookie-баннере. Версия в ключе: при смене текста согласия спросим заново. */
export type CookieConsent = { analytics: boolean; at: string };

export function readConsent(): CookieConsent | null {
  const raw = safeStorage.get(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CookieConsent;
  } catch {
    return null;
  }
}

export function saveConsent(analytics: boolean) {
  safeStorage.set(KEY, JSON.stringify({ analytics, at: new Date().toISOString() } satisfies CookieConsent));
}
