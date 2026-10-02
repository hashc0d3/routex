"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n";

type Sample = { direct: number; routed: number; directJitter: number; routedJitter: number };

const HISTORY = 24;
const SCALE_MS = 130;

const BASE: Sample = { direct: 78, routed: 41, directJitter: 15, routedJitter: 3 };

function next(): Sample {
  const spike = Math.random() < 0.2 ? 18 + Math.random() * 25 : 0;
  return {
    direct: Math.round(70 + Math.random() * 16 + spike),
    routed: Math.round(39 + Math.random() * 4),
    directJitter: Math.round(11 + Math.random() * 9),
    routedJitter: Math.round(2 + Math.random() * 2),
  };
}

function seed(): Sample[] {
  return Array.from({ length: HISTORY }, (_, i) => ({
    ...BASE,
    direct: BASE.direct + ((i * 7) % 13) - 4 + (i % 6 === 0 ? 22 : 0),
    routed: BASE.routed + ((i * 3) % 4) - 1,
  }));
}

function Sparkline({ values, accent }: { values: number[]; accent: boolean }) {
  const w = 120;
  const h = 32;
  const step = w / (values.length - 1);
  const y = (v: number) => h - Math.min(1, v / SCALE_MS) * h;
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const id = accent ? "spark-red" : "spark-white";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={accent ? "#ff2b2b" : "#ffffff"} stopOpacity={accent ? 0.35 : 0.12} />
          <stop offset="1" stopColor={accent ? "#ff2b2b" : "#ffffff"} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={accent ? "#ff2b2b" : "rgba(255,255,255,0.45)"}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Gauge({
  label,
  value,
  jitter,
  jitterLabel,
  history,
  accent,
}: {
  label: string;
  value: number;
  jitter: number;
  jitterLabel: string;
  history: number[];
  accent: boolean;
}) {
  const fill = Math.min(100, (value / SCALE_MS) * 100);
  return (
    <div
      className={`rx-cut-sm relative overflow-hidden p-4 ${
        accent ? "bg-gradient-to-br from-rx-red/20 via-rx-red/[0.06] to-transparent" : "bg-white/[0.03]"
      }`}
    >
      {accent ? <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-rx-red via-rx-red2 to-transparent" /> : null}
      <p className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${accent ? "text-rx-red2" : "text-white/45"}`}>
        {accent ? <span className="h-1.5 w-1.5 rotate-45 animate-blink bg-rx-red2" /> : <span className="h-1.5 w-1.5 rotate-45 bg-white/30" />}
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-1 font-display text-4xl tabular-nums leading-none">
        {value}
        <span className="text-base text-white/40">ms</span>
      </p>
      <div className="mt-3">
        <Sparkline values={history} accent={accent} />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="relative h-1 flex-1 overflow-hidden bg-white/10">
          <div
            className={`absolute inset-y-0 left-0 transition-[width] duration-700 ease-out ${accent ? "bg-rx-red shadow-[0_0_8px_#ff2b2b]" : "bg-white/40"}`}
            style={{ width: `${fill}%` }}
          />
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-white/40">
          {jitterLabel} {jitter} ms
        </span>
      </div>
    </div>
  );
}

export function LivePing() {
  const { d } = useLocale();
  const [history, setHistory] = useState<Sample[]>(seed);
  const s = history[history.length - 1];
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = true;
    const id = window.setInterval(() => {
      if (visible && document.visibilityState === "visible") setHistory((h) => [...h.slice(1), next()]);
    }, 1100);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    if (root.current) io.observe(root.current);
    return () => {
      window.clearInterval(id);
      io.disconnect();
    };
  }, []);

  const gain = Math.round((1 - s.routed / s.direct) * 100);

  return (
    <div ref={root} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Gauge
          label={d.ping.direct}
          value={s.direct}
          jitter={s.directJitter}
          jitterLabel={d.ping.jitter}
          history={history.map((x) => x.direct)}
          accent={false}
        />
        <Gauge
          label={d.ping.routed}
          value={s.routed}
          jitter={s.routedJitter}
          jitterLabel={d.ping.jitter}
          history={history.map((x) => x.routed)}
          accent
        />
      </div>
      <p className="text-xs text-white/40">
        {d.ping.notePrefix} <span className="font-semibold text-rx-red2 tabular-nums">−{gain}%</span>. {d.ping.noteSuffix}
      </p>
    </div>
  );
}
