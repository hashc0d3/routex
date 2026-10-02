"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/Avatar";
import { CtaButton } from "@/components/CtaButton";
import { CloseIcon, GlobeIcon, LogoutIcon, WindowsIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { LanguageSwitch } from "@/components/UserMenu";
import type { Dictionary } from "@/i18n";
import { useLocale } from "@/lib/i18n";
import { lockScroll } from "@/lib/scroll-lock";
import { useSession } from "@/lib/session";

export function BurgerButton({ open, onClick, label }: { open: boolean; onClick: () => void; label: string }) {
  const bar = "absolute left-1/2 h-0.5 -translate-x-1/2 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]";
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      onClick={onClick}
      className="relative h-9 w-9 border border-white/15 transition hover:border-white/40 lg:hidden"
    >
      <span className={`${bar} w-5 bg-white ${open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-[10px]"}`} />
      <span className={`${bar} top-1/2 w-3.5 -translate-y-1/2 bg-rx-red ${open ? "scale-x-0 opacity-0" : ""}`} />
      <span className={`${bar} w-5 bg-white ${open ? "top-1/2 -translate-y-1/2 -rotate-45" : "top-[22px]"}`} />
    </button>
  );
}

export function MobileMenu({
  open,
  onClose,
  links,
  active,
}: {
  open: boolean;
  onClose: () => void;
  links: { id: string; label: keyof Dictionary["nav"] }[];
  active: string | null;
}) {
  const router = useRouter();
  const { d, href } = useLocale();
  const { ready, user, logout } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onResize = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) onClose();
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const unlock = lockScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      unlock();
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="lg:hidden">
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={d.common.menu}
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-[86%] max-w-sm flex-col border-l border-white/10 bg-rx-panel shadow-[-30px_0_80px_-20px_rgba(0,0,0,0.9)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <span className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-rx-red to-transparent" />
        <div className="rx-grid pointer-events-none absolute inset-0 opacity-60" />

        <div className="relative flex h-[60px] items-center justify-between border-b border-white/10 px-5">
          <Link href={href("/")} onClick={onClose} className="no-underline">
            <Logo className="h-7 w-auto" />
          </Link>
          <button
            type="button"
            aria-label={d.notifications.close}
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center border border-white/15 text-white/70 transition hover:border-white/40 hover:text-white"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <nav className="relative min-h-0 flex-1 overflow-y-auto px-5 py-2">
          <ul>
            {links.map(({ id, label }, i) => {
              const isActive = active === id;
              return (
                <li
                  key={id}
                  className={`transition-all duration-500 ease-out ${open ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"}`}
                  style={{ transitionDelay: open ? `${80 + i * 50}ms` : "0ms" }}
                >
                  <Link
                    href={href(`/#${id}`)}
                    onClick={onClose}
                    className={`group flex items-center gap-4 border-b border-white/5 py-2.5 font-display text-lg uppercase tracking-[0.08em] no-underline transition-colors ${
                      isActive ? "text-white" : "text-white/70 hover:text-white"
                    }`}
                  >
                    <span className={`font-sans text-xs tabular-nums ${isActive ? "text-rx-red2" : "text-white/25"}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {d.nav[label]}
                    <span
                      className={`ml-auto h-1.5 w-1.5 rotate-45 bg-rx-red transition-opacity ${
                        isActive ? "opacity-100 shadow-[0_0_8px_#ff2b2b]" : "opacity-0 group-hover:opacity-60"
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="relative shrink-0 space-y-0.5 border-t border-white/10 px-5 py-3">
          {ready && user ? (
            <Link href={href("/account")} onClick={onClose} className="flex items-center gap-3 py-2 text-white/80 no-underline">
              <Avatar nickname={user.nickname} src={user.avatarUrl} size={40} />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-white">{user.nickname}</span>
                <span className="block text-xs text-white/45">{d.common.account}</span>
              </span>
            </Link>
          ) : (
            <Link href={href("/login")} onClick={onClose} className="block py-2 text-white/80 no-underline">
              {d.common.login}
            </Link>
          )}
          <div className="flex items-center justify-between py-2 text-sm text-white/70">
            <span className="flex items-center gap-3">
              <GlobeIcon size={16} className="text-white/45" />
              {d.common.language}
            </span>
            <LanguageSwitch />
          </div>
          {ready && user ? (
            <button
              type="button"
              className="flex items-center gap-3 py-2 text-left text-sm text-white/55 transition hover:text-rx-red2"
              onClick={() => {
                onClose();
                void logout().then(() => router.push(href("/")));
              }}
            >
              <LogoutIcon size={16} />
              {d.common.logout}
            </button>
          ) : null}
          <CtaButton href={href("/download")} onClick={onClose} className="mt-2 w-full justify-between">
            <WindowsIcon size={16} className="mr-2.5" />
            {d.common.downloadWindows}
          </CtaButton>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
