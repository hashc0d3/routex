"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  exact = false,
  badge,
  children,
}: {
  href: string;
  exact?: boolean;
  badge?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex items-center justify-between border-l-2 px-3 py-2 transition ${
        active ? "border-rx-red bg-rx-red/10 text-white" : "border-transparent text-white/60 hover:text-white"
      }`}
    >
      {children}
      {badge ? <span className="bg-rx-red px-1.5 text-[11px] font-semibold text-white">{badge}</span> : null}
    </Link>
  );
}
