"use client";

import { LivePing } from "@/components/LivePing";
import { RouteVisual } from "@/components/RouteVisual";
import { useLocale } from "@/lib/i18n";

export function RouteCard({ title }: { title: string }) {
  const { d } = useLocale();
  return (
    <div className="relative">
      <div aria-hidden className="rx-hud pointer-events-none absolute -inset-2.5" />
      <div aria-hidden className="pointer-events-none absolute -inset-6 -z-10 bg-[radial-gradient(ellipse_at_70%_40%,rgba(225,6,0,0.25),transparent_65%)] blur-2xl" />

      <div className="rx-cut relative bg-gradient-to-br from-rx-red/70 via-white/10 to-rx-red/30 p-px">
        <div className="rx-cut relative overflow-hidden bg-[linear-gradient(160deg,#130708_0%,#0b0b0e_45%,#09090b_100%)]">
          <div aria-hidden className="rx-scan pointer-events-none absolute inset-0 opacity-60" />
          <div aria-hidden className="rx-grid pointer-events-none absolute inset-0 opacity-70" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-rx-red/[0.07] to-transparent"
          />

          <div className="relative flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-5 py-3">
            <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
              <span className="relative flex h-3 w-3 items-center justify-center">
                <span className="absolute h-3 w-3 rotate-45 border border-rx-red/70" />
                <span className="h-1 w-1 rotate-45 bg-rx-red2" />
              </span>
              {title}
            </p>
            <div className="flex items-center gap-2">
              <span className="hidden border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/45 sm:inline">
                {d.route.paths} <span className="text-white/80">3/3</span>
              </span>
              <span className="flex items-center gap-1.5 bg-rx-red/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-rx-red2 ring-1 ring-rx-red/40">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-rx-red2" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-rx-red2" />
                </span>
                live · {d.route.demo}
              </span>
            </div>
          </div>

          <div className="relative px-4 pt-2">
            <RouteVisual />
          </div>

          <div className="relative px-5 pb-5">
            <LivePing />
          </div>
        </div>
      </div>
    </div>
  );
}
