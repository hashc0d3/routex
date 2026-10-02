"use client";

import { useLocale } from "@/lib/i18n";

const HEX = "M32 3 L57 17.5 L57 46.5 L32 61 L7 46.5 L7 17.5 Z";

export function AchievementBadge({
  months,
  unlocked,
  fresh = false,
  size = 64,
}: {
  months: number;
  unlocked: boolean;
  fresh?: boolean;
  size?: number;
}) {
  const { d } = useLocale();
  const label = d.badge(months);
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden
      className={`shrink-0 ${fresh ? "animate-pop" : ""} ${unlocked ? "" : "opacity-60"}`}
    >
      {unlocked ? <path d={HEX} fill="rgba(225,6,0,0.25)" className="animate-glow" transform="scale(1.08) translate(-2.4 -2.4)" /> : null}
      <path
        d={HEX}
        fill={unlocked ? "#1a0404" : "#0d0d10"}
        stroke={unlocked ? "#e10600" : "rgba(255,255,255,0.18)"}
        strokeWidth={2.5}
      />
      <path
        d="M32 11 L50 21.5 L50 42.5 L32 53 L14 42.5 L14 21.5 Z"
        fill="none"
        stroke={unlocked ? "rgba(255,43,43,0.45)" : "rgba(255,255,255,0.06)"}
        strokeWidth={1}
      />
      <text
        x="32"
        y="38"
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fill={unlocked ? "#fff" : "rgba(255,255,255,0.3)"}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {label}
      </text>
    </svg>
  );
}
