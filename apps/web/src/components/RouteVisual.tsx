"use client";

import { useLocale } from "@/lib/i18n";

const PATHS = [
  { d: "M44 150 C120 150 140 62 222 62 S330 150 384 150", dur: "1.9s", unstable: false },
  { d: "M44 150 L384 150", dur: "1.6s", unstable: false },
  { d: "M44 150 C120 150 140 238 222 238 S330 150 384 150", dur: "2.1s", unstable: true },
];

const EXIT = "M384 150 L486 150";

export function RouteVisual() {
  const { d } = useLocale();
  return (
    <svg viewBox="0 0 530 300" className="h-auto max-h-[30dvh] w-full" role="img" aria-label={d.route.aria}>
      {PATHS.map((p) => (
        <path
          key={p.d}
          d={p.d}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={2}
          strokeDasharray="6 6"
          className={`animate-dash-flow ${p.unstable ? "animate-blink" : ""}`}
        />
      ))}
      <path d={EXIT} fill="none" stroke="#e10600" strokeWidth={2.5} />

      {PATHS.map((p, i) =>
        [0, 0.6, 1.2].map((offset) => (
          <circle key={`${i}-${offset}`} r={4} fill={p.unstable ? "rgba(255,255,255,0.55)" : "#ff2b2b"}>
            <animateMotion dur={p.dur} begin={`${offset + i * 0.2}s`} repeatCount="indefinite" path={p.d} />
          </circle>
        )),
      )}
      {[0, 0.4, 0.8, 1.2].map((offset) => (
        <circle key={`exit-${offset}`} r={4.5} fill="#ff2b2b">
          <animateMotion dur="1.6s" begin={`${offset}s`} repeatCount="indefinite" path={EXIT} />
        </circle>
      ))}

      <Node x={44} y={150} label={d.route.you} />
      <Node x={222} y={62} label={d.route.node(1)} small />
      <Node x={222} y={150} label={d.route.node(2)} small />
      <Node x={222} y={238} label={d.route.node(3)} small />
      <Node x={384} y={150} label={d.route.exit} small />
      <Node x={486} y={150} label={d.route.server} accent />
    </svg>
  );
}

function Node({ x, y, label, small, accent }: { x: number; y: number; label: string; small?: boolean; accent?: boolean }) {
  const r = small ? 9 : 13;
  return (
    <g>
      {accent ? (
        <circle cx={x} cy={y} r={r} fill="none" stroke="#ff2b2b" strokeWidth={1.5}>
          <animate attributeName="r" values={`${r};${r + 22}`} dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
        </circle>
      ) : null}
      <circle cx={x} cy={y} r={r + 7} fill={accent ? "rgba(225,6,0,0.18)" : "rgba(255,255,255,0.05)"} className={accent ? "animate-glow" : ""} />
      <circle cx={x} cy={y} r={r} fill="#0d0d10" stroke={accent ? "#e10600" : "rgba(255,255,255,0.45)"} strokeWidth={2} />
      <text x={x} y={y + r + 22} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={12}>
        {label}
      </text>
    </g>
  );
}
