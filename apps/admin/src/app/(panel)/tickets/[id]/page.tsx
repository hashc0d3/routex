import { notFound } from "next/navigation";
import { reply } from "../../../actions";
import { requireStaff, UUID_RE } from "@/lib/staff";
import { contactOf, fmtDate, getTicket, statusOf, SupportUnavailable, type TicketStatus } from "@/lib/support";
import { AutoRefresh } from "../../AutoRefresh";
import { BackLink, PageTitle, StatusBadge, Unavailable } from "../../ui";
import { StatusForm } from "./StatusForm";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("tickets");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  let t;
  try {
    t = await getTicket(id);
  } catch (e) {
    if (e instanceof SupportUnavailable) return <Unavailable message={e.message} />;
    if (e instanceof Error && e.message === "not_found") notFound();
    throw e;
  }
  const c = contactOf(t);

  const info: [string, React.ReactNode][] = [
    [c.kind, <>{c.who}{c.sub ? <span className="block text-xs text-white/40">{c.sub}</span> : null}</>],
    ["Источник", t.source === "web" ? "Сайт" : "Клиент Windows"],
    ["Язык", t.locale.toUpperCase()],
    ["Логи", t.attachOk ? "Разрешены" : "Нет согласия"],
    ["Согласие ПДн", t.pdConsentAt ? fmtDate(t.pdConsentAt) : "при регистрации"],
    ["Создана", fmtDate(t.createdAt)],
    ["Обновлена", fmtDate(t.updatedAt)],
  ];
  if (t.userId) info.splice(1, 0, ["ID пользователя", <code key="uid" className="break-all text-xs">{t.userId}</code>]);

  return (
    <>
      <BackLink href="/tickets">Все заявки</BackLink>
      <div className="mt-3">
        <PageTitle sub={<StatusBadge status={t.status} />}>
          <span className="text-white/40">#{t.number}</span> {t.subject}
        </PageTitle>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="space-y-3">
          <AutoRefresh />
          {t.messages.map((m) => {
            if (m.author === "system") {
              return (
                <p key={m.id} className="flex items-center gap-3 py-1 text-[11px] uppercase tracking-wider text-white/35">
                  <span className="h-px flex-1 bg-white/10" />
                  Статус → {statusOf(m.body as TicketStatus).label} · {fmtDate(m.createdAt)}
                  <span className="h-px flex-1 bg-white/10" />
                </p>
              );
            }
            const staff = m.author === "staff";
            return (
              <article
                key={m.id}
                className={`border p-4 ${staff ? "ml-10 border-rx-red/30 bg-rx-red/[0.06]" : "mr-10 border-white/10 bg-rx-panel"}`}
              >
                <header className="mb-2 flex justify-between text-xs text-white/45">
                  <span>
                    {staff ? "Поддержка" : "Пользователь"}
                    {m.authorName ? ` · ${m.authorName}` : ""}
                  </span>
                  <time>{fmtDate(m.createdAt)}</time>
                </header>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
              </article>
            );
          })}

          <form action={reply} className="ml-10 space-y-2">
            <input type="hidden" name="id" value={t.id} />
            <textarea
              name="body"
              rows={4}
              required
              maxLength={4000}
              placeholder="Ответ пользователю"
              className="w-full resize-y border border-white/12 bg-black/60 px-3 py-2 text-sm outline-none focus:border-rx-red"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-white/35">
                {t.userId
                  ? "Пользователь увидит ответ в кабинете и получит уведомление. Статус станет «Ждёт ответа»."
                  : "Гость не видит переписку на сайте — свяжитесь с ним по указанному контакту."}
              </p>
              <button className="btn btn-primary">Отправить</button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <StatusForm id={t.id} current={t.status} />
          <dl className="divide-y divide-white/5 border border-white/10 bg-rx-panel text-sm">
            {info.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_1fr] gap-2 px-4 py-2.5">
                <dt className="text-white/40">{k}</dt>
                <dd className="min-w-0">{v}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </>
  );
}
