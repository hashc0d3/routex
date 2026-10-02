import type { Locale } from "./config";
import { en } from "./en";
import { ru, type Dictionary } from "./ru";

const DICTIONARIES: Record<Locale, Dictionary> = { ru, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export type { Dictionary };
export * from "./config";
