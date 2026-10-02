"use client";

import { CtaButton } from "@/components/CtaButton";
import { useLocale } from "@/lib/i18n";

const BROKEN = "M40 120 C110 120 130 60 200 60 S270 120 300 120";
const ALIVE = "M40 120 C110 120 130 180 200 180 S330 120 460 120";

export default function NotFound() {
  const { d, href } = useLocale();
  const t = d.notFound;
  return (
    <section className="relative flex min-h-[calc(100dvh-var(--header-h))] items-center overflow-hidden">
      <div className="rx-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 animate-glow bg-[radial-gradient(ellipse,rgba(225,6,0,0.22),transparent_65%)]" />
      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-5 py-10 text-center">
        <p className="relative select-none font-display text-[8rem] leading-none text-white md:text-[11rem]">
          <span aria-hidden className="absolute inset-0 translate-x-[3px] text-rx-red/70 mix-blend-screen animate-blink">
            404
          </span>
          <span className="relative">404</span>
        </p>

        <svg viewBox="0 0 500 240" className="mt-2 h-auto max-h-[28dvh] w-full max-w-lg" aria-hidden>
          <path d={BROKEN} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={2} strokeDasharray="6 6" />
          <path d="M304 112 L320 128 M320 112 L304 128" stroke="#ff2b2b" strokeWidth={2.5} strokeLinecap="square" />
          <circle r={4} fill="rgba(255,255,255,0.6)">
            <animateMotion dur="1.8s" repeatCount="indefinite" path={BROKEN} keyPoints="0;1" keyTimes="0;1" />
            <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.85;1" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <path d={ALIVE} fill="none" stroke="rgba(225,6,0,0.55)" strokeWidth={2} strokeDasharray="6 6" className="animate-dash-flow" />
          {[0, 0.6, 1.2].map((o) => (
            <circle key={o} r={4} fill="#ff2b2b">
              <animateMotion dur="1.8s" begin={`${o}s`} repeatCount="indefinite" path={ALIVE} />
            </circle>
          ))}
          <circle cx={40} cy={120} r={10} fill="#0d0d10" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
          <circle cx={460} cy={120} r={12} fill="#0d0d10" stroke="#e10600" strokeWidth={2} />
          <text x={312} y={96} fill="rgba(255,43,43,0.85)" fontSize={12} textAnchor="middle">
            {t.loss}
          </text>
        </svg>

        <h1 className="mt-4 font-display text-4xl uppercase md:text-5xl">{t.title}</h1>
        <p className="mt-4 max-w-md text-white/60">{t.lead}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <CtaButton href={href("/")}>{t.home}</CtaButton>
          <CtaButton href={href("/support")} variant="ghost" arrow={false}>
            {t.support}
          </CtaButton>
        </div>
      </div>
    </section>
  );
}
