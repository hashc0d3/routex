"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { clientApi, getAccessToken } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import type { MyTicket, TicketStatus } from "@/lib/types";
import { Skeleton } from "./Skeleton";

const TONE: Record<TicketStatus, string> = {
  open: "border-white/25 bg-white/5 text-white/80",
  in_progress: "border-amber-400/50 bg-amber-400/10 text-amber-300",
  waiting: "border-rx-red/60 bg-rx-red/15 text-rx-red2",
  resolved: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  closed: "border-white/10 bg-transparent text-white/40",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const { d } = useLocale();
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${TONE[status]}`}>
      {status === "waiting" ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rx-red2" /> : null}
      {d.tickets.status[status]}
    </span>
  );
}

const POLL_MS = 20_000;

export function MyTickets() {
  const { d, href } = useLocale();
  const t = d.tickets;
  const [items, setItems] = useState<MyTicket[] | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      setItems(await clientApi.listMyTickets(token));
    } catch {
      setItems((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const fmt = (iso: string) => new Date(iso).toLocaleString(d.dateLocale, { dateStyle: "short", timeStyle: "short" });

  return (
    <section className="mt-6 border border-white/10 p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xs uppercase tracking-wider text-white/40">{t.title}</h2>
        <Link href={href("/support")} className="text-sm text-rx-red2 no-underline hover:underline">
          + {t.create}
        </Link>
      </div>

      {items === null ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-white/50">{t.empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/5 border border-white/10">
          {items.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={href(`/account/tickets/${ticket.id}`)}
                className="group flex items-center gap-4 px-4 py-3 no-underline transition hover:bg-white/[0.03]"
              >
                <span className="w-14 shrink-0 font-mono text-sm text-white/40">#{ticket.number}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-white group-hover:text-rx-red2">{ticket.subject}</span>
                  <span className="text-xs text-white/40">{t.updated(fmt(ticket.updatedAt))}</span>
                </span>
                {ticket.unread ? (
                  <span className="hidden shrink-0 bg-rx-red px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white sm:inline">
                    {t.newReply}
                  </span>
                ) : null}
                <TicketStatusBadge status={ticket.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
