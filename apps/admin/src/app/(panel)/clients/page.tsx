import Link from "next/link";
import { billingLookup, listClients, ServiceUnavailable, type BillingSummary } from "@/lib/clients";
import { PLAN_LABEL } from "@/lib/clients-shared";
import { requireStaff } from "@/lib/staff";
import { fmtDate } from "@/lib/support";
import { ActionLink, BackLink, ClientAvatar, PageTitle, SubscriptionBadge, Unavailable } from "../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Клиенты" };

const TAKE = 25;
const STATES = [
  { id: "active", label: "Активные" },
  { id: "deleted", label: "Удалённые" },
  { id: "all", label: "Все" },
] as const;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; state?: string }>;
}) {
  await requireStaff("clients");
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const state = STATES.find((s) => s.id === sp.state)?.id ?? "active";
  const page = Math.max(1, Number(sp.page) || 1);

  let data;
  try {
    data = await listClients({ q, page, take: TAKE, state });
  } catch (e) {
    if (e instanceof ServiceUnavailable)
      return (
        <>
          <PageTitle>Клиенты</PageTitle>
          <Unavailable title="Сервис аккаунтов недоступен" message={e.message} scripts={["dev:identity"]} />
        </>
      );
    throw e;
  }

  // billing упал — список клиентов всё равно нужен, подписки покажем как «нет данных»
  const billing: Record<string, BillingSummary> | null = await billingLookup(data.items.map((c) => c.id)).catch(
    () => null,
  );

  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q, state: state === "active" ? undefined : state, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/clients?${s}` : "/clients";
  };
  const pages = Math.max(1, Math.ceil(data.total / TAKE));

  return (
    <>
      <PageTitle sub="Аккаунты сайта и PC-клиента. Сотрудники админки — в разделе «Администраторы».">Клиенты</PageTitle>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav className="flex flex-wrap gap-1.5">
          {STATES.map((s) => (
            <Link
              key={s.id}
              href={link({ state: s.id === "active" ? undefined : s.id, page: undefined })}
              className={`btn btn-sm ${state === s.id ? "btn-primary" : "btn-ghost"}`}
            >
              {s.label}
              {state === s.id ? <span className="text-white/75">{data.total}</span> : null}
            </Link>
          ))}
        </nav>
        <form className="ml-auto flex items-stretch gap-2" action="/clients">
          {state !== "active" ? <input type="hidden" name="state" value={state} /> : null}
          <input
            name="q"
            defaultValue={q}
            placeholder="Ник, email или ID"
            className="w-72 border border-white/12 bg-black/60 px-3 py-1.5 text-sm outline-none transition focus:border-rx-red"
          />
          <button className="btn btn-sm btn-ghost">Найти</button>
        </form>
      </div>

      {billing === null ? (
        <p className="mb-4 border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs text-amber-200">
          Сервис billing не отвечает — подписки сейчас не видны. Запусти <code>npm run dev:billing</code>.
        </p>
      ) : null}

      {data.items.length === 0 ? (
        <p className="border border-white/10 bg-rx-panel p-6 text-sm text-white/50">
          {q ? "Ничего не найдено." : "Клиентов пока нет — они появятся после регистрации на сайте."}
        </p>
      ) : (
        <div className="overflow-x-auto border border-white/10">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-[0.15em] text-white/40">
              <tr>
                <th className="px-4 py-3 font-medium">Клиент</th>
                <th className="px-4 py-3 font-medium">Подписка</th>
                <th className="px-4 py-3 font-medium">Месяцев</th>
                <th className="px-4 py-3 font-medium">Последний вход</th>
                <th className="px-4 py-3 font-medium">Регистрация</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.items.map((c) => {
                const sub = billing?.[c.id];
                return (
                  <tr key={c.id} className={c.deletedAt ? "opacity-50" : ""}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ClientAvatar nickname={c.nickname} src={c.avatarUrl} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{c.nickname}</p>
                          <p className="truncate text-xs text-white/45">{c.deletedAt ? `удалён ${fmtDate(c.deletedAt)}` : c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.deletedAt ? (
                        <span className="text-white/35">—</span>
                      ) : (
                        <>
                          <SubscriptionBadge status={sub?.status ?? null} />
                          {sub ? (
                            <p className="mt-1 text-xs text-white/45">
                              {PLAN_LABEL[sub.planCode] ?? sub.planCode} · до {fmtDate(sub.currentPeriodEnd)}
                            </p>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-white/70">{sub?.monthsTogether ?? "—"}</td>
                    <td className="px-4 py-3 text-white/60">{c.lastLoginAt ? fmtDate(c.lastLoginAt) : "—"}</td>
                    <td className="px-4 py-3 text-white/60">{fmtDate(c.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <ActionLink href={`/clients/${c.id}`}>Открыть</ActionLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <div className="mt-4 flex items-center gap-3 text-sm text-white/55">
          {page > 1 ? <BackLink href={link({ page: String(page - 1) })}>Назад</BackLink> : null}
          <span className="font-mono text-xs text-white/45">
            {page} / {pages}
          </span>
          {page < pages ? <ActionLink href={link({ page: String(page + 1) })}>Дальше</ActionLink> : null}
        </div>
      ) : null}
    </>
  );
}
