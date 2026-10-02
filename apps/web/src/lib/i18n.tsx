"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo } from "react";
import { type Dictionary, getDictionary, type Locale, localizePath, stripLocale } from "@/i18n";
import { ApiError } from "@/lib/types";

type Ctx = {
  locale: Locale;
  d: Dictionary;
  href: (path: string) => string;
  switchTo: (locale: Locale) => void;
  errorText: (err: unknown) => string;
};

const LocaleContext = createContext<Ctx | null>(null);

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const d = getDictionary(locale);

  const href = useCallback((path: string) => localizePath(path, locale), [locale]);

  const switchTo = useCallback(
    (target: Locale) => {
      if (target === locale) return;
      const rest = stripLocale(pathname);
      router.push(localizePath(rest, target) + window.location.search + window.location.hash);
    },
    [locale, pathname, router],
  );

  const errorText = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.code in d.errors) return d.errors[err.code as keyof typeof d.errors];
      if (err instanceof Error && err.message) return err.message;
      return d.errors.generic;
    },
    [d],
  );

  const value = useMemo(() => ({ locale, d, href, switchTo, errorText }), [locale, d, href, switchTo, errorText]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}
