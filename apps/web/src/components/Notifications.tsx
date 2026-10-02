"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AchievementBadge } from "@/components/AchievementBadge";
import Link from "next/link";
import {
  BellIcon,
  CardIcon,
  CloseIcon,
  FlagIcon,
  PlayIcon,
  RenewIcon,
  SupportIcon,
  TrashIcon,
  UserIcon,
} from "@/components/icons";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { useLocale } from "@/lib/i18n";
import { useNotifications } from "@/lib/notifications";
import { lockScroll } from "@/lib/scroll-lock";
import type { AppNotification } from "@/lib/types";
import type { Dictionary } from "@/i18n";

function planName(d: Dictionary, code: string) {
  if (code === "pro_year") return d.plans.year.name;
  if (code === "pro_month") return d.plans.pro.name;
  return d.plans.trial.name;
}

function describe(n: AppNotification, d: Dictionary) {
  const t = d.notifications;
  const date = (iso: unknown) => new Date(String(iso)).toLocaleDateString(d.dateLocale);
  const num = (v: unknown) => Number(v) || 0;
  switch (n.type) {
    case "account_created":
      return { title: t.account_created.title, body: t.account_created.body(String(n.data.nickname ?? "")) };
    case "subscription_purchased":
      return {
        title: t.subscription_purchased.title,
        body: t.subscription_purchased.body(planName(d, String(n.data.plan)), date(n.data.until)),
      };
    case "subscription_renewed":
      return {
        title: t.subscription_renewed.title,
        body: t.subscription_renewed.body(planName(d, String(n.data.plan)), date(n.data.until)),
      };
    case "achievement_unlocked": {
      const title = d.achievements[String(n.data.code)]?.title ?? String(n.data.code);
      return { title: t.achievement_unlocked.title, body: t.achievement_unlocked.body(title) };
    }
    case "session_started":
      return {
        title: t.session_started.title,
        body: t.session_started.body(String(n.data.game), num(n.data.paths)),
      };
    case "session_ended":
      return {
        title: t.session_ended.title,
        body: t.session_ended.body(String(n.data.game), num(n.data.minutes), num(n.data.ping), num(n.data.gain)),
      };
    case "ticket_reply":
      return { title: t.ticket_reply.title, body: t.ticket_reply.body(num(n.data.number)) };
    case "ticket_status":
      return {
        title: t.ticket_status.title,
        body: t.ticket_status.body(num(n.data.number), d.tickets.status[String(n.data.status)] ?? String(n.data.status)),
      };
  }
}

/** Куда ведёт уведомление по клику (если ведёт). */
function targetOf(n: AppNotification) {
  if ((n.type === "ticket_reply" || n.type === "ticket_status") && n.data.ticketId) {
    return `/account/tickets/${n.data.ticketId}`;
  }
  return null;
}

function TypeIcon({ n }: { n: AppNotification }) {
  if (n.type === "achievement_unlocked") {
    const months = ACHIEVEMENTS.find((a) => a.code === n.data.code)?.months ?? 1;
    return <AchievementBadge months={months} unlocked size={36} />;
  }
  if (n.type === "ticket_reply" || n.type === "ticket_status") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-rx-red/60 bg-rx-red/15 text-rx-red2">
        <SupportIcon size={16} />
      </span>
    );
  }
  const Icon =
    n.type === "account_created"
      ? UserIcon
      : n.type === "subscription_purchased"
        ? CardIcon
        : n.type === "subscription_renewed"
          ? RenewIcon
          : n.type === "session_started"
            ? PlayIcon
            : FlagIcon;
  const accent = n.type === "session_started" || n.type === "subscription_purchased";
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center border ${
        accent ? "border-rx-red/60 bg-rx-red/15 text-rx-red2" : "border-white/15 bg-white/5 text-white/70"
      }`}
    >
      <Icon size={16} />
    </span>
  );
}

function useRelativeTime(locale: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  return (iso: string) => {
    const sec = Math.round((new Date(iso).getTime() - now) / 1000);
    const abs = Math.abs(sec);
    if (abs < 45) return rtf.format(0, "second");
    if (abs < 3600) return rtf.format(Math.round(sec / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(sec / 3600), "hour");
    return rtf.format(Math.round(sec / 86400), "day");
  };
}

export function NotificationsButton() {
  const { d, locale } = useLocale();
  const { items, unread, markAllRead } = useNotifications();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ago = useRelativeTime(locale);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const unlock = lockScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      unlock();
    };
  }, [open]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function close() {
    setOpen(false);
    if (unread > 0) void markAllRead();
  }

  const panel = (
    <Panel open={open} close={close} items={items} unread={unread} markAllRead={markAllRead} ago={ago} />
  );

  return (
    <>
      <button
        type="button"
        aria-label={d.notifications.open}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className="group relative flex h-9 w-9 items-center justify-center border border-white/10 text-white/70 transition hover:border-white/30 hover:text-white"
      >
        <BellIcon size={18} className={unread > 0 ? "origin-top group-hover:animate-bell" : ""} />
        {unread > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-rx-red/50" />
            <span className="relative flex h-full min-w-full items-center justify-center rounded-full bg-rx-red px-1 text-[10px] font-bold leading-none text-white ring-2 ring-rx-black">
              {unread > 9 ? "9+" : unread}
            </span>
          </span>
        ) : null}
      </button>

      {mounted ? createPortal(panel, document.body) : null}
    </>
  );
}

function Panel({
  open,
  close,
  items,
  unread,
  markAllRead,
  ago,
}: {
  open: boolean;
  close: () => void;
  items: AppNotification[];
  unread: number;
  markAllRead: () => Promise<void>;
  ago: (iso: string) => string;
}) {
  const { d, href, errorText } = useLocale();
  const { clearAll } = useNotifications();
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearErr, setClearErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setConfirming(false);
      setClearErr(null);
    }
  }, [open]);

  async function clear() {
    setClearing(true);
    setClearErr(null);
    try {
      await clearAll();
      setConfirming(false);
    } catch (err) {
      setClearErr(errorText(err));
    } finally {
      setClearing(false);
    }
  }

  return (
    <>
      <div
        aria-hidden={!open}
        onClick={close}
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={d.notifications.title}
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-sm flex-col border-l border-white/10 bg-rx-panel shadow-[-30px_0_80px_-20px_rgba(0,0,0,0.9)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <span className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-rx-red to-transparent" />
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="font-display text-xl uppercase">{d.notifications.title}</h2>
            {unread > 0 ? <p className="text-xs text-rx-red2">{d.notifications.unread(unread)}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="px-2 py-1 text-xs text-white/55 transition hover:text-white"
              >
                {d.notifications.markAll}
              </button>
            ) : null}
            <button
              type="button"
              aria-label={d.notifications.close}
              onClick={close}
              className="flex h-8 w-8 items-center justify-center border border-white/10 text-white/60 transition hover:border-white/30 hover:text-white"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 text-white/30">
              <BellIcon size={24} />
            </span>
            <p className="text-sm text-white/45">{d.notifications.empty}</p>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-white/5 overflow-y-auto">
            {items.map((n, i) => {
              const { title, body } = describe(n, d);
              const target = targetOf(n);
              const content = (
                <>
                  {!n.readAt ? <span className="absolute left-0 top-4 h-9 w-0.5 bg-rx-red" /> : null}
                  <TypeIcon n={n} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-white">{title}</p>
                      <time dateTime={n.createdAt} className="shrink-0 text-[11px] text-white/35">
                        {ago(n.createdAt)}
                      </time>
                    </div>
                    <p className="mt-1 text-sm text-white/60">{body}</p>
                  </div>
                </>
              );
              const row = `relative flex gap-3 px-5 py-4 transition-colors ${n.readAt ? "" : "bg-rx-red/[0.05]"}`;
              return (
                <li
                  key={n.id}
                  className={open ? "animate-fade-up" : ""}
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  {target ? (
                    <Link href={href(target)} onClick={close} className={`${row} no-underline hover:bg-white/[0.04]`}>
                      {content}
                    </Link>
                  ) : (
                    <div className={row}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {items.length > 0 ? (
          <footer className="shrink-0 border-t border-white/10 px-5 py-3">
            {confirming ? (
              <div className="flex items-center justify-between gap-3 animate-fade-up">
                <p className="text-xs text-white/60">{d.notifications.clearAsk(items.length)}</p>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="border border-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/60 transition hover:border-white/40 hover:text-white"
                  >
                    {d.common.cancel}
                  </button>
                  <button
                    type="button"
                    disabled={clearing}
                    onClick={() => void clear()}
                    className="flex items-center gap-1.5 bg-rx-red px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-rx-red2 disabled:opacity-60"
                  >
                    <TrashIcon size={13} />
                    {d.notifications.clearYes}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="group flex w-full items-center justify-center gap-2 border border-white/10 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/55 transition hover:border-rx-red/50 hover:bg-rx-red/[0.06] hover:text-rx-red2"
              >
                <TrashIcon size={14} className="transition group-hover:scale-110" />
                {d.notifications.clear}
              </button>
            )}
            {clearErr ? <p className="mt-2 text-xs text-rx-red2">{clearErr}</p> : null}
          </footer>
        ) : null}
      </aside>
    </>
  );
}
