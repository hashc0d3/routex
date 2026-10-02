"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readConsent, saveConsent } from "@/lib/consent";
import { useLocale } from "@/lib/i18n";

export function ConsentBanner() {
  const { d, href } = useLocale();
  const t = d.consent;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!readConsent()) setVisible(true);
  }, []);

  if (!visible) return null;

  function choose(analytics: boolean) {
    saveConsent(analytics);
    setVisible(false);
  }

  return (
    <div
      role="region"
      aria-label={t.title}
      className="fixed bottom-4 left-4 right-20 z-40 animate-toast-in sm:bottom-6 sm:left-6 sm:right-auto sm:w-[420px]"
    >
      <div className="rx-cut-sm relative border-l-2 border-rx-red bg-rx-panel/95 p-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.95)] backdrop-blur">
        <p className="font-display text-base uppercase tracking-wide">{t.title}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-white/65">{t.text}</p>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <Link href={href("/legal/personal-data")} className="text-white/80 underline hover:text-white">
            {t.policy}
          </Link>
          <Link href={href("/legal/privacy")} className="text-white/80 underline hover:text-white">
            {t.privacy}
          </Link>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => choose(true)}
            className="rx-cut-sm bg-rx-red px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-rx-red2"
          >
            {t.accept}
          </button>
          <button
            type="button"
            onClick={() => choose(false)}
            className="border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/75 transition hover:border-white/40 hover:text-white"
          >
            {t.necessary}
          </button>
        </div>
      </div>
    </div>
  );
}
