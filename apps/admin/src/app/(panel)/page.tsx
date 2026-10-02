import Link from "next/link";
import { contactOf, fmtDate, listTickets, STATUSES, supportHealth, SupportUnavailable } from "@/lib/support";
import { serviceHealth } from "@/lib/clients";
import { requireStaff } from "@/lib/staff";
import { ActionLink, PageTitle, StatusBadge, Unavailable } from "./ui";

export const dynamic = "force-dynamic";

export default async function Overview() {
  await requireStaff("overview");
  const [health, identityOk, billingOk, data] = await Promise.all([
    supportHealth(),
    serviceHealth("identity"),
    serviceHealth("billing"),
    listTickets({ take: 6 }).catch((e: unknown) => (e instanceof SupportUnavailable ? e : Promise.reject(e))),
  ]);

  return (
    <>
      <PageTitle sub="Сводка по всем сервисам RouteX">Обзор</PageTitle>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { name: "support", ok: health, note: "заявки, FAQ" },
          { name: "identity", ok: identityOk, note: identityOk === null ? "не настроен" : "аккаунты клиентов" },
          { name: "billing", ok: billingOk, note: billingOk === null ? "не настроен" : "подписки, оплаты" },
          { name: "routing", ok: null, note: "ещё не поднят" },
        ].map((s) => (
          <div key={s.name} className="border border-white/10 bg-rx-panel px-4 py-3">
            <p className="flex items-center gap-2 font-mono text-sm">
              <span
                className={`h-2 w-2 rounded-full ${
                  s.ok === null ? "bg-white/20" : s.ok ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-rx-red"
                }`}
              />
              {s.name}
            </p>
            <p className="mt-1 text-xs text-white/40">{s.ok === false ? "не отвечает" : s.note}</p>
          </div>
        ))}
      </section>

      {data instanceof SupportUnavailable ? (
        <Unavailable message={data.message} />
      ) : (
        <>
          <section className="mb-8 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {STATUSES.map((s) => (
              <Link
                key={s.id}
                href={`/tickets?status=${s.id}`}
                className="border border-white/10 bg-rx-panel px-4 py-4 transition hover:border-rx-red/50"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">{s.label}</p>
                <p className="mt-1 font-display text-4xl">{data.counts[s.id]}</p>
              </Link>
            ))}
          </section>

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-xl uppercase">Последние заявки</h2>
              <ActionLink href="/tickets">Все заявки</ActionLink>
            </div>
            {data.items.length === 0 ? (
              <p className="border border-white/10 bg-rx-panel p-5 text-sm text-white/50">Заявок пока нет.</p>
            ) : (
              <ul className="divide-y divide-white/5 border border-white/10 bg-rx-panel">
                {data.items.map((t) => {
                  const c = contactOf(t);
                  return (
                    <li key={t.id}>
                      <Link href={`/tickets/${t.id}`} className="flex items-center gap-4 px-4 py-3 transition hover:bg-white/[0.03]">
                        <span className="w-14 font-mono text-sm text-white/40">#{t.number}</span>
                        <span className="min-w-0 flex-1 truncate">{t.subject}</span>
                        <span className="hidden w-44 truncate text-sm text-white/55 md:block">{c.who}</span>
                        <StatusBadge status={t.status} />
                        <span className="hidden w-32 text-right text-xs text-white/40 lg:block">{fmtDate(t.createdAt)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
