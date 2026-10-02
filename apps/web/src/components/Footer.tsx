"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useLocale } from "@/lib/i18n";

export function Footer() {
  const { d, href } = useLocale();
  const links = [
    ["/#how", d.nav.how],
    ["/#reviews", d.nav.reviews],
    ["/#pricing", d.nav.pricing],
    ["/#partners", d.nav.partners],
    ["/#faq", d.nav.faq],
    ["/legal/terms", d.footer.offer],
    ["/legal/privacy", d.footer.privacy],
  ];
  return (
    <footer className="mt-auto border-t border-white/10 bg-black">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between">
        <Logo className="h-7 w-auto" />
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/50">
          {links.map(([path, label]) => (
            <Link key={path} href={href(path)} className="hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="border-t border-white/5 px-5 py-4 text-center text-xs text-white/35">
        © {new Date().getFullYear()} RouteX
      </p>
    </footer>
  );
}
