"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { CheckIcon, SupportIcon } from "@/components/icons";
import { TicketStatusBadge } from "@/components/MyTickets";
import { ChatSkeleton, Skeleton } from "@/components/Skeleton";
import { clientApi, getAccessToken } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { useNotifications } from "@/lib/notifications";
import { useSession } from "@/lib/session";
import type { MyTicketDetail, TicketStatus } from "@/lib/types";

const POLL_MS = 5_000;

function stepOf(status: TicketStatus) {
  if (status === "closed" || status === "resolved") return 2;
  if (status === "open") return 0;
  return 1;
}

function Progress({ status }: { status: TicketStatus }) {
  const { d } = useLocale();
  const current = stepOf(status);
  const finished = status === "closed" || status === "resolved";
  const green = status === "resolved";
  return (
    <ol className="grid grid-cols-3 gap-2">
      {d.tickets.steps.map((label, i) => {
        const done = i < current || finished;
        const active = i === current && !finished;
        return (
          <li key={label}>
            <div
              className={`h-1 transition-colors duration-500 ${
                done
                  ? green
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                    : "bg-rx-red"
                  : active
                    ? "bg-gradient-to-r from-rx-red to-white/10"
                    : "bg-white/10"
              }`}
            />
            <p
              className={`mt-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider ${
                done || active ? "text-white" : "text-white/35"
              }`}
            >
              {done ? <CheckIcon size={12} className={green ? "text-emerald-300" : "text-rx-red2"} /> : null}
              {active ? <span className="h-1.5 w-1.5 rotate-45 bg-rx-red shadow-[0_0_8px_#ff2b2b]" /> : null}
              {label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export default function TicketChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { d, href, errorText } = useLocale();
  const t = d.tickets;
  const { ready, user } = useSession();
  const notifications = useNotifications();
  const [ticket, setTicket] = useState<MyTicketDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  useEffect(() => {
    if (ready && !user) router.replace(href("/login"));
  }, [ready, user, router, href]);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      setTicket(await clientApi.getMyTicket(token, id));
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  }, [id, errorText]);

  useEffect(() => {
    if (!user) return;
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [user, load]);

  // сервер отметил ответ прочитанным — обновляем колокольчик и бейджи
  useEffect(() => {
    if (ticket) void notifications.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id]);

  useEffect(() => {
    const count = ticket?.messages.length ?? 0;
    if (count > lastCount.current) bottom.current?.scrollIntoView({ behavior: lastCount.current ? "smooth" : "instant", block: "end" });
    lastCount.current = count;
  }, [ticket?.messages.length]);

  async function send(e?: FormEvent | KeyboardEvent<HTMLTextAreaElement>) {
    e?.preventDefault();
    const token = getAccessToken();
    const body = draft.trim();
    if (!token || !body) return;
    setSending(true);
    try {
      setTicket(await clientApi.replyMyTicket(token, id, body));
      setDraft("");
      setError(null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSending(false);
    }
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString(d.dateLocale, { dateStyle: "short", timeStyle: "short" });

  if (!ready || !user) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Skeleton className="h-4 w-28" />
        <ChatSkeleton label={d.common.loading} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link href={href("/account")} className="text-sm text-white/45 no-underline hover:text-white">
        ← {t.back}
      </Link>

      {!ticket ? (
        error ? (
          <p className="mt-6 border-l-2 border-rx-red bg-rx-red/10 px-4 py-3 text-sm">{error}</p>
        ) : (
          <ChatSkeleton label={d.common.loading} />
        )
      ) : (
        <>
          <header className="mt-4 border border-white/10 bg-rx-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs text-white/40">
                  {t.number(ticket.number)} · {t.created(fmt(ticket.createdAt))}
                </p>
                <h1 className="mt-1 font-display text-2xl uppercase leading-tight">{ticket.subject}</h1>
              </div>
              <TicketStatusBadge status={ticket.status} />
            </div>
            <div className="mt-5">
              <Progress status={ticket.status} />
            </div>
          </header>

          <section className="mt-4 space-y-3" aria-live="polite">
            {ticket.messages.map((m) => {
              if (m.author === "system") {
                return (
                  <p key={m.id} className="flex items-center gap-3 py-1 text-[11px] uppercase tracking-wider text-white/35">
                    <span className="h-px flex-1 bg-white/10" />
                    {t.statusChanged(t.status[m.body] ?? m.body)} · {fmt(m.createdAt)}
                    <span className="h-px flex-1 bg-white/10" />
                  </p>
                );
              }
              const mine = m.author === "user";
              return (
                <div key={m.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                  {mine ? (
                    <Avatar nickname={user.nickname} src={user.avatarUrl} size={34} />
                  ) : (
                    <span className="rx-cut-sm flex h-[34px] w-[34px] shrink-0 items-center justify-center bg-rx-red text-white">
                      <SupportIcon size={16} />
                    </span>
                  )}
                  <div
                    className={`max-w-[80%] border px-4 py-3 ${
                      mine ? "border-white/10 bg-white/[0.04]" : "border-rx-red/30 bg-rx-red/[0.07]"
                    }`}
                  >
                    <p className="mb-1 flex gap-3 text-[11px] text-white/40">
                      <span className="font-semibold uppercase tracking-wider">{mine ? t.you : t.staff}</span>
                      <time dateTime={m.createdAt}>{fmt(m.createdAt)}</time>
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">{m.body}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottom} />
          </section>

          {ticket.status === "waiting" ? (
            <p className="mt-5 border-l-2 border-rx-red bg-rx-red/10 px-4 py-2 text-sm">{t.waitingNote}</p>
          ) : ticket.status === "resolved" ? (
            <p className="mt-5 border-l-2 border-emerald-400/60 bg-emerald-400/[0.07] px-4 py-2 text-sm text-emerald-200/90">
              {t.resolvedNote}
            </p>
          ) : ticket.status === "closed" ? (
            <p className="mt-5 border-l-2 border-white/20 bg-white/[0.03] px-4 py-2 text-sm text-white/60">{t.closedNote}</p>
          ) : null}

          <form onSubmit={(e) => void send(e)} className="mt-4 flex gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void send(e);
              }}
              rows={2}
              maxLength={4000}
              placeholder={t.placeholder}
              className="min-w-0 flex-1 resize-none border border-white/12 bg-black/50 px-3 py-2.5 text-sm outline-none transition placeholder:text-white/30 focus:border-rx-red"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="rx-cut-sm shrink-0 bg-gradient-to-r from-rx-red to-rx-red2 px-5 text-sm font-semibold uppercase tracking-wider text-white transition hover:brightness-110 disabled:opacity-40"
            >
              {sending ? t.sending : t.send}
            </button>
          </form>
          {error ? <p className="mt-3 text-sm text-rx-red2">{error}</p> : null}
        </>
      )}
    </div>
  );
}
