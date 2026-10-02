import Link from "next/link";
import { ArrowIcon } from "@/components/icons";

const CUT = {
  sm: "[clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]",
  md: "[clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)]",
  lg: "[clip-path:polygon(14px_0,100%_0,100%_calc(100%-14px),calc(100%-14px)_100%,0_100%,0_14px)]",
};

const PAD = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3.5 text-sm",
  lg: "px-8 py-4 text-base",
};

function SlidingArrow({ size }: { size: number }) {
  return (
    <span className="relative block overflow-hidden" style={{ width: size, height: size }}>
      <ArrowIcon
        size={size}
        className="absolute inset-0 transition-transform duration-300 ease-out group-hover:translate-x-full"
      />
      <ArrowIcon
        size={size}
        className="absolute inset-0 -translate-x-full transition-transform duration-300 ease-out group-hover:translate-x-0"
      />
    </span>
  );
}

export function CtaButton({
  href,
  children,
  variant = "primary",
  size = "md",
  arrow = true,
  className = "",
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  size?: "sm" | "md" | "lg";
  arrow?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const arrowSize = size === "lg" ? 20 : size === "sm" ? 14 : 18;

  if (variant === "ghost") {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`group relative inline-flex items-center gap-3 border border-white/15 bg-white/[0.03] font-semibold text-white no-underline transition duration-300 hover:border-white/40 hover:bg-white/[0.06] ${PAD[size]} ${className}`}
      >
        <span className="absolute -left-px -top-px h-2 w-2 border-l-2 border-t-2 border-rx-red transition-all duration-300 group-hover:h-3.5 group-hover:w-3.5" />
        <span className="absolute -bottom-px -right-px h-2 w-2 border-b-2 border-r-2 border-rx-red transition-all duration-300 group-hover:h-3.5 group-hover:w-3.5" />
        {children}
        {arrow ? (
          <span className="text-white/60 transition group-hover:text-rx-red2">
            <SlidingArrow size={arrowSize} />
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative inline-flex items-stretch overflow-hidden bg-gradient-to-r from-rx-red to-[#c00500] font-semibold text-white no-underline shadow-[0_10px_30px_-10px_rgba(225,6,0,0.7)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-8px_rgba(255,43,43,0.8)] ${CUT[size]} ${className}`}
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-[150%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[350%]" />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 to-transparent opacity-60" />
      <span className={`relative flex items-center ${PAD[size]}`}>{children}</span>
      {arrow ? (
        <span className="relative flex items-center border-l border-white/20 bg-black/20 px-3.5 transition-colors duration-300 group-hover:bg-black/35">
          <SlidingArrow size={arrowSize} />
        </span>
      ) : null}
    </Link>
  );
}
