"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AchievementBadge } from "@/components/AchievementBadge";
import { Avatar } from "@/components/Avatar";
import { ChevronDownIcon, GlobeIcon, LogoutIcon, UserIcon } from "@/components/icons";
import { LOCALES } from "@/i18n";
import { achievementState } from "@/lib/achievements";
import { useLocale } from "@/lib/i18n";
import { useSession } from "@/lib/session";

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { locale, switchTo } = useLocale();
  return (
    <div role="radiogroup" className={`flex border border-white/10 bg-black/40 p-0.5 ${className}`}>
      {LOCALES.map((l) => {
        const on = l.code === locale;
        return (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={on}
            title={l.label}
            onClick={() => switchTo(l.code)}
            className={`px-2.5 py-1 text-xs font-semibold tracking-wider transition ${
              on ? "bg-rx-red text-white" : "text-white/50 hover:text-white"
            }`}
          >
            {l.short}
          </button>
        );
      })}
    </div>
  );
}

export function UserMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loyalty, subscription, logout } = useSession();
  const subscriptionLive =
    subscription != null &&
    subscription.status !== "expired" &&
    new Date(subscription.currentPeriodEnd).getTime() > Date.now();
  const { d, href } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const top = loyalty ? achievementState(loyalty).top : null;

  async function onLogout() {
    setOpen(false);
    await logout();
    router.push(href("/"));
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={d.common.accountMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="group flex items-center gap-2 text-white/85 transition hover:text-white"
      >
        <Avatar
          nickname={user.nickname}
          src={user.avatarUrl}
          size={34}
          className="transition duration-300 group-hover:scale-105"
        />
        <span className="hidden max-w-[140px] truncate font-medium sm:inline">{user.nickname}</span>
        {top ? (
          <span className="hidden sm:inline" title={d.achievements[top.code]?.title}>
            <AchievementBadge months={top.months} unlocked size={22} />
          </span>
        ) : null}
        <ChevronDownIcon
          size={14}
          className={`hidden text-white/50 transition-transform duration-300 sm:block ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        id={menuId}
        role="menu"
        className={`absolute right-0 top-[calc(100%+12px)] w-72 origin-top-right border border-white/10 bg-rx-panel/95 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur transition duration-200 ${
          open ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0"
        }`}
      >
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rx-red to-transparent" />

        <div className="flex items-center gap-3 border-b border-white/10 p-4">
          <Avatar nickname={user.nickname} src={user.avatarUrl} size={44} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{user.nickname}</p>
            <p className="truncate text-xs text-white/45">{user.email}</p>
            {subscription ? (
              subscriptionLive ? (
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-emerald-300">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                  {subscription.status === "trial" ? d.userMenu.trial : d.userMenu.active}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-rx-red2">{d.userMenu.expired}</p>
              )
            ) : null}
          </div>
        </div>

        <div className="p-1.5">
          <Link
            href={href("/account")}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="group/item flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 no-underline transition hover:bg-white/5 hover:text-white"
          >
            <UserIcon size={16} className="text-white/45 transition group-hover/item:text-rx-red2" />
            {d.common.account}
          </Link>

          <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-white/80">
            <span className="flex items-center gap-3">
              <GlobeIcon size={16} className="text-white/45" />
              {d.common.language}
            </span>
            <LanguageSwitch />
          </div>
        </div>

        <div className="border-t border-white/10 p-1.5">
          <button
            type="button"
            role="menuitem"
            onClick={() => void onLogout()}
            className="group/item flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-white/70 transition hover:bg-rx-red/10 hover:text-rx-red2"
          >
            <LogoutIcon size={16} className="text-white/45 transition group-hover/item:text-rx-red2" />
            {d.common.logout}
          </button>
        </div>
      </div>
    </div>
  );
}
