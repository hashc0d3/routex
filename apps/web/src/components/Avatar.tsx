import Image from "next/image";

const BACKGROUNDS = ["#e10600", "#9e0b0b", "#5c1010", "#2a2a31", "#3d0a0a"];

function pick(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return BACKGROUNDS[Math.abs(h) % BACKGROUNDS.length];
}

export function Avatar({
  nickname,
  src,
  size = 32,
  ring = true,
  className = "",
}: {
  nickname: string;
  src: string | null;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const ringWidth = ring ? Math.max(2, Math.round(size * 0.04)) : 0;
  const gap = ring ? Math.max(2, Math.round(size * 0.03)) : 0;
  const inner = size - (ringWidth + gap) * 2;

  const face = src ? (
    <Image
      src={src}
      alt={nickname}
      width={inner}
      height={inner}
      unoptimized
      className="block rounded-full object-cover"
      style={{ width: inner, height: inner }}
    />
  ) : (
    <span
      aria-label={nickname}
      className="flex select-none items-center justify-center rounded-full font-display uppercase text-white"
      style={{
        width: inner,
        height: inner,
        background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18), transparent 60%), ${pick(nickname)}`,
        fontSize: inner * 0.45,
      }}
    >
      {nickname.trim()[0] ?? "?"}
    </span>
  );

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        padding: ringWidth,
        background: ring ? "conic-gradient(from 220deg, #ff2b2b, #e10600 30%, #3d0a0a 55%, #e10600 80%, #ff2b2b)" : undefined,
        boxShadow: ring ? "0 0 16px rgba(225,6,0,0.35)" : undefined,
      }}
    >
      <span
        className="flex items-center justify-center rounded-full bg-rx-black"
        style={{ width: size - ringWidth * 2, height: size - ringWidth * 2 }}
      >
        {face}
      </span>
    </span>
  );
}
