"use client";

import { useEffect } from "react";
import { CtaButton } from "@/components/CtaButton";
import { useLocale } from "@/lib/i18n";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { d, href } = useLocale();
  const t = d.crash;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="relative flex min-h-[calc(100dvh-var(--header-h))] items-center overflow-hidden">
      <div className="rx-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 animate-glow bg-[radial-gradient(ellipse,rgba(225,6,0,0.2),transparent_65%)]" />
      <div className="relative mx-auto flex w-full max-w-xl flex-col items-center px-5 py-10 text-center">
        <span className="rx-cut-sm flex h-16 w-16 items-center justify-center bg-rx-red/15 font-display text-4xl text-rx-red2">
          !
        </span>
        <h1 className="mt-6 font-display text-4xl uppercase md:text-5xl">{t.title}</h1>
        <p className="mt-4 text-white/60">{t.lead}</p>
        {error.digest ? <p className="mt-2 font-mono text-xs text-white/35">{t.code(error.digest)}</p> : null}
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rx-cut-sm bg-gradient-to-r from-rx-red to-rx-red2 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(225,6,0,0.8)] transition hover:brightness-110"
          >
            {t.retry}
          </button>
          <CtaButton href={href("/")} variant="ghost" arrow={false}>
            {t.home}
          </CtaButton>
        </div>
      </div>
    </section>
  );
}
