"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CtaButton } from "@/components/CtaButton";
import { WindowsIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { BurgerButton, MobileMenu } from "@/components/MobileMenu";
import { NotificationsButton } from "@/components/Notifications";
import { LanguageSwitch, UserMenu } from "@/components/UserMenu";
import { type Dictionary, stripLocale } from "@/i18n";
import { useLocale } from "@/lib/i18n";
import { useSession } from "@/lib/session";

const links: { id: string; label: keyof Dictionary["nav"] }[] = [
  { id: "how", label: "how" },
  { id: "features", label: "features" },
  { id: "games", label: "games" },
  { id: "pricing", label: "pricing" },
  { id: "faq", label: "faq" },
];

export function Header() {
  const pathname = usePathname();
  const { ready, user } = useSession();
  const { d, locale, href } = useLocale();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const isHome = stripLocale(pathname) === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  const [active, setActive] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    if (!isHome) {
      setActive(null);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.35;
      let current: string | null = null;
      for (const { id } of links) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= line && r.bottom > line) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [isHome]);

  useLayoutEffect(() => {
    const measure = () => {
      const el = active ? linkRefs.current[active] : null;
      const nav = navRef.current;
      if (!el || !nav) {
        setIndicator((prev) => (prev ? { ...prev, width: 0 } : null));
        return;
      }
      const n = nav.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setIndicator({ left: r.left - n.left, width: r.width });
    };
    measure();
    void document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, locale]);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
        scrolled ? "border-white/10 bg-rx-black/90 backdrop-blur" : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[60px] max-w-[1320px] items-center gap-4 px-5">
        <Link href={href("/")} className="shrink-0 no-underline">
          <Logo className="h-7 w-auto md:h-8" priority />
        </Link>
        <nav ref={navRef} className="relative ml-14 hidden items-center gap-9 lg:flex">
          {links.map(({ id, label }) => {
            const isActive = active === id;
            return (
              <Link
                key={id}
                href={href(`/#${id}`)}
                ref={(el) => {
                  linkRefs.current[id] = el;
                }}
                onClick={() => setActive(id)}
                aria-current={isActive ? "true" : undefined}
                className="group relative py-1 font-display text-[15px] uppercase tracking-[0.14em] text-white no-underline transition duration-300 hover:[text-shadow:0_0_14px_rgba(255,43,43,0.75)]"
              >
                <span
                  aria-hidden="true"
                  className={`absolute -left-3.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rotate-45 bg-rx-red shadow-[0_0_8px_#ff2b2b] transition duration-300 ${
                    isActive ? "scale-100 opacity-100" : "scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                  }`}
                />
                {d.nav[label]}
              </Link>
            );
          })}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-1 h-0.5 bg-rx-red shadow-[0_0_10px_rgba(255,43,43,0.9)] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
            style={{
              left: indicator?.left ?? 0,
              width: indicator?.width ?? 0,
              opacity: indicator && indicator.width > 0 ? 1 : 0,
            }}
          />
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {!ready ? null : user ? (
            <>
              <NotificationsButton />
              <UserMenu />
            </>
          ) : (
            <>
              <LanguageSwitch className="hidden lg:flex" />
              <CtaButton href={href("/login")} variant="ghost" size="sm" arrow={false} className="hidden sm:inline-flex">
                {d.common.login}
              </CtaButton>
            </>
          )}
          <CtaButton href={href("/download")} size="sm" arrow={false} className="hidden sm:inline-flex">
            <WindowsIcon size={14} className="mr-2" />
            {d.common.download}
          </CtaButton>
          <BurgerButton open={menuOpen} onClick={() => setMenuOpen((v) => !v)} label={d.common.menu} />
        </div>
      </div>
      <MobileMenu open={menuOpen} onClose={closeMenu} links={links} active={active} />
    </header>
  );
}
