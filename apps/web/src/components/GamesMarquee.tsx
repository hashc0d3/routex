"use client";

import { useLocale } from "@/lib/i18n";

const ROW_A = ["Counter-Strike 2", "Dota 2", "Valorant", "Apex Legends", "PUBG", "Fortnite", "Overwatch 2"];
const ROW_B = ["Call of Duty: Warzone", "Rainbow Six Siege", "League of Legends"];
const SOON = ["GTA Online", "World of Tanks", "Escape from Tarkov", "Marvel Rivals"];

function Tile({ name, soon, soonLabel, hidden }: { name: string; soon: boolean; soonLabel: string; hidden: boolean }) {
  return (
    <span
      aria-hidden={hidden}
      className={`rx-cut-sm group relative flex items-center gap-3 whitespace-nowrap px-6 py-4 font-display text-xl uppercase tracking-wide transition duration-300 ${
        soon
          ? "bg-white/[0.03] text-white/35"
          : "bg-gradient-to-br from-white/[0.07] to-white/[0.02] text-white/90 hover:from-rx-red/30 hover:to-rx-red/5 hover:text-white"
      }`}
    >
      <span className={`h-2 w-2 rotate-45 ${soon ? "bg-white/20" : "bg-rx-red shadow-[0_0_8px_#ff2b2b]"}`} />
      {name}
      {soon ? (
        <span className="border border-rx-red/40 px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider text-rx-red2">
          {soonLabel}
        </span>
      ) : null}
    </span>
  );
}

function Row({ items, reverse, soonLabel }: { items: { g: string; soon: boolean }[]; reverse?: boolean; soonLabel: string }) {
  return (
    <div className={`flex w-max gap-3 ${reverse ? "animate-marquee-rev" : "animate-marquee"}`}>
      {[...items, ...items].map(({ g, soon }, i) => (
        <Tile key={`${g}-${i}`} name={g} soon={soon} soonLabel={soonLabel} hidden={i >= items.length} />
      ))}
    </div>
  );
}

export function GamesMarquee() {
  const { d } = useLocale();
  const a = ROW_A.map((g) => ({ g, soon: false }));
  const b = [...ROW_B.map((g) => ({ g, soon: false })), ...SOON.map((g) => ({ g, soon: true }))];
  return (
    <div className="rx-marquee relative space-y-3 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <Row items={[...a, ...a]} soonLabel={d.home.games.soon} />
      <Row items={[...b, ...b]} reverse soonLabel={d.home.games.soon} />
    </div>
  );
}
