import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,css}"],
  theme: {
    extend: {
      colors: {
        rx: {
          black: "#050506",
          panel: "#0d0d10",
          red: "#e10600",
          red2: "#ff2b2b",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "Impact", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "marquee-rev": {
          from: { transform: "translateX(-50%)" },
          to: { transform: "translateX(0)" },
        },
        "slow-zoom": {
          from: { transform: "scale(1.04)" },
          to: { transform: "scale(1.12)" },
        },
        scan: {
          from: { transform: "translateY(-100%)" },
          to: { transform: "translateY(100%)" },
        },
        glow: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        "dash-flow": {
          to: { strokeDashoffset: "-24" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
        pop: {
          "0%": { transform: "scale(0.6) rotate(-12deg)", opacity: "0" },
          "60%": { transform: "scale(1.15) rotate(4deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0)", opacity: "1" },
        },
        bell: {
          "0%, 100%": { transform: "rotate(0)" },
          "20%": { transform: "rotate(14deg)" },
          "40%": { transform: "rotate(-12deg)" },
          "60%": { transform: "rotate(8deg)" },
          "80%": { transform: "rotate(-4deg)" },
        },
        "toast-in": {
          from: { transform: "translateY(16px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        shimmer: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        marquee: "marquee 40s linear infinite",
        "marquee-rev": "marquee-rev 46s linear infinite",
        "slow-zoom": "slow-zoom 24s ease-in-out infinite alternate",
        scan: "scan 6s linear infinite",
        glow: "glow 6s ease-in-out infinite",
        "dash-flow": "dash-flow 1.2s linear infinite",
        blink: "blink 1.6s ease-in-out infinite",
        pop: "pop 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.3) both",
        "toast-in": "toast-in 0.35s ease-out both",
        bell: "bell 0.6s ease-in-out",
        shimmer: "shimmer 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
