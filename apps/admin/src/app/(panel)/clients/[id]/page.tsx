import Link from "next/link";
import { notFound } from "next/navigation";
import { billingOf, getClient, ServiceUnavailable } from "@/lib/clients";
import { CONSENT_LABEL, fmtMoney, PLAN_LABEL } from "@/lib/clients-shared";
import { can } from "@/lib/rbac";
import { requireStaff, UUID_RE } from "@/lib/staff";
import { fmtDate, listTickets } from "@/lib/support";
import { BackLink, ClientAvatar, PageTitle, StatusBadge, SubscriptionBadge, Unavailable } from "../../ui";
import { RevokeForm } from "./RevokeForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Клиент" };

const card = "border border-white/10 bg-rx-panel p-5";
const h2 = "mb-3 text-[11px] uppercase tracking-[0.18em] text-white/45";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("clients");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  let client;
  try {
    client = await getClient(id);
  } catch (e) {
    if (e instanceof Error && e.message === "not_found") notFound();
    if (e instanceof ServiceUnavailable)
      return (
        <>
          <BackLink href="/clients">Клиенты</BackLink>
          <div className="mt-4">
            <Unavailable title="Сервис аккаунтов недоступен" message={e.message} scripts={["dev:identity"]} />
          </div>
        </>
      );
    throw e;
  }

  const [billing, tickets] = await Promise.all([
    billingOf(id).catch(() => null),
    can(staff.role, "tickets")
      ? listTickets({ q: client.deletedAt ? id : client.email, take: 10 })
          .then((r) => r.items.filter((t) => t.userId === id))
          .catch(() => null)
      : Promise.resolve(null),
  ]);
  const activeSessions = client.sessions.filter((s) => s.active).length;
  const sub = billing?.subscription ?? null;

  return (
    <>
      <BackLink href="/clients">Клиенты</BackLink>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <ClientAvatar nickname={client.nickname} src={client.avatarUrl} size={64} />
        <div className="min-w-0">
          <PageTitle sub={client.deletedAt ? `Аккаунт удалён ${fmtDate(client.deletedAt)}` : client.email}>
            {client.nickname}
          </PageTitle>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={card}>
          <h2 className={h2}>Аккаунт</h2>
          <dl className="space-y-2 text-sm">
            {[
              ["ID", <code key="id" className="break-all font-mono text-xs text-white/70">{client.id}</code>],
              ["Регистрация", fmtDate(client.createdAt)],
              ["Последний вход", client.lastLoginAt ? fmtDate(client.lastLoginAt) : "—"],
              ["Изменён", fmtDate(client.updatedAt)],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between gap-4">
                <dt className="text-white/45">{k}</dt>
                <dd className="text-right text-white/80">{v}</dd>
              </div>
            ))}
          </dl>
          {client.consents.length ? (
            <>
              <h2 className={`${h2} mt-5`}>Согласия</h2>
              <ul className="space-y-1.5 text-sm">
                {client.consents.map((c) => (
                  <li key={c.type} className="flex justify-between gap-4">
                    <span className="text-white/70">{CONSENT_LABEL[c.type] ?? c.type}</span>
                    <span className={c.accepted ? "text-emerald-300" : "text-white/40"}>{c.accepted ? "да" : "нет"}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <section className={card}>
          <h2 className={h2}>Подписка</h2>
          {billing === null ? (
            <p className="text-sm text-amber-200">Сервис billing не отвечает.</p>
          ) : sub ? (
            <>
              <SubscriptionBadge status={sub.status} />
              <p className="mt-3 font-display text-2xl uppercase">{PLAN_LABEL[sub.planCode] ?? sub.planCode}</p>
              <p className="mt-1 text-sm text-white/55">
                {sub.status === "expired" ? "Закончилась" : "Действует до"} {fmtDate(sub.currentPeriodEnd)}
              </p>
              <p className="mt-4 text-sm text-white/55">
                Оплачено месяцев: <span className="font-mono text-white">{billing.monthsTogether}</span>
              </p>
              {billing.achievements.length ? (
                <p className="mt-1 text-xs text-white/40">Ачивки: {billing.achievements.map((a) => a.code.replace("months_", "")).join(", ")} мес.</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-white/45">Подписки нет — клиент ещё не заходил в кабинет или аккаунт удалён.</p>
          )}
        </section>

        <section className={card}>
          <h2 className={h2}>Сессии входа</h2>
          <p className="mb-3 text-sm text-white/60">
            Активных: <span className="font-mono text-white">{activeSessions}</span>
          </p>
          {client.deletedAt ? null : <RevokeForm id={client.id} active={activeSessions} />}
          <p className="mt-3 text-xs text-white/40">Пригодится, если клиент потерял устройство или пароль утёк.</p>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <h2 className={h2}>Платежи</h2>
          {!billing?.payments.length ? (
            <p className="text-sm text-white/45">Платежей нет.</p>
          ) : (
            <ul className="divide-y divide-white/5 text-sm">
              {billing.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 py-2">
                  <span className="text-white/80">{PLAN_LABEL[p.planCode] ?? p.planCode}</span>
                  <span className="font-mono">{fmtMoney(p.amountMinor, p.currency)}</span>
                  <span className={p.status === "succeeded" ? "text-emerald-300" : "text-white/45"}>
                    {p.provider === "mock" ? "демо" : p.provider}
                  </span>
                  <span className="text-xs text-white/40">{fmtDate(p.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={card}>
          <h2 className={h2}>Заявки</h2>
          {tickets === null ? (
            <p className="text-sm text-white/45">
              {can(staff.role, "tickets") ? "Сервис заявок не отвечает." : "Нет доступа к заявкам."}
            </p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-white/45">Заявок нет.</p>
          ) : (
            <ul className="divide-y divide-white/5 text-sm">
              {tickets.map((t) => (
                <li key={t.id}>
                  <Link href={`/tickets/${t.id}`} className="flex items-center gap-3 py-2 transition hover:text-white">
                    <span className="w-12 font-mono text-white/40">#{t.number}</span>
                    <span className="min-w-0 flex-1 truncate text-white/80">{t.subject}</span>
                    <StatusBadge status={t.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {client.sessions.length ? (
        <section className={`${card} mt-4`}>
          <h2 className={h2}>Последние входы</h2>
          <ul className="divide-y divide-white/5 text-sm">
            {client.sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <span className={`h-2 w-2 rounded-full ${s.active ? "bg-emerald-400" : "bg-white/20"}`} />
                <span className="w-36 text-white/70">{fmtDate(s.createdAt)}</span>
                <span className="w-28 font-mono text-xs text-white/50">{s.ip ?? "—"}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-white/40">{s.userAgent ?? "—"}</span>
                <span className="text-xs text-white/40">активность {fmtDate(s.lastSeenAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
