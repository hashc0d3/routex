import Link from "next/link";
import { contactOf, fmtDate, listTickets, STATUSES, SupportUnavailable } from "@/lib/support";
import { requireStaff } from "@/lib/staff";
import { ActionLink, BackLink, PageTitle, StatusBadge, Unavailable } from "../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Заявки" };

const TAKE = 25;

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  await requireStaff("tickets");
  const sp = await searchParams;
  const status = STATUSES.some((s) => s.id === sp.status) ? sp.status : undefined;
  const q = sp.q?.trim() || undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  let data;
  try {
    data = await listTickets({ status, q, page, take: TAKE });
  } catch (e) {
    if (e instanceof SupportUnavailable)
      return (
        <>
          <PageTitle>Заявки</PageTitle>
          <Unavailable message={e.message} />
        </>
      );
    throw e;
  }

  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status, q, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/tickets?${s}` : "/tickets";
  };
  const pages = Math.max(1, Math.ceil(data.total / TAKE));
  const all = Object.values(data.counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageTitle sub="Баг-репорты и обращения с сайта и из клиента">Заявки</PageTitle>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav className="flex flex-wrap gap-1.5">
          {[{ id: undefined, label: "Все", n: all }, ...STATUSES.map((s) => ({ id: s.id, label: s.label, n: data.counts[s.id] }))].map(
            (tab) => (
              <Link
                key={tab.label}
                href={link({ status: tab.id, page: undefined })}
                className={`btn btn-sm ${status === tab.id ? "btn-primary" : "btn-ghost"}`}
              >
                {tab.label}
                <span className={status === tab.id ? "text-white/75" : "text-white/35"}>{tab.n}</span>
              </Link>
            ),
          )}
        </nav>
        <form className="ml-auto flex items-stretch gap-2" action="/tickets">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <input
            name="q"
            defaultValue={q}
            placeholder="№, ник, email, телефон, текст"
            className="w-72 border border-white/12 bg-black/60 px-3 py-1.5 text-sm outline-none transition focus:border-rx-red"
          />
          <button className="btn btn-sm btn-ghost">Найти</button>
        </form>
      </div>

      {data.items.length === 0 ? (
        <p className="border border-white/10 bg-rx-panel p-6 text-sm text-white/50">Ничего не найдено.</p>
      ) : (
        <div className="overflow-x-auto border border-white/10 bg-rx-panel">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-[11px] uppercase tracking-[0.15em] text-white/40">
              <tr>
                <th className="px-4 py-2.5 font-normal">№</th>
                <th className="px-4 py-2.5 font-normal">Проблема</th>
                <th className="px-4 py-2.5 font-normal">Кто</th>
                <th className="px-4 py-2.5 font-normal">Откуда</th>
                <th className="px-4 py-2.5 font-normal">Статус</th>
                <th className="px-4 py-2.5 font-normal">Создана</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.items.map((t) => {
                const c = contactOf(t);
                return (
                  <tr key={t.id} className="transition hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-mono text-white/45">
                      <Link href={`/tickets/${t.id}`} className="flex items-center gap-2">
                        {t.unread ? (
                          <span title="Новое сообщение от пользователя" className="h-2 w-2 rounded-full bg-rx-red2 shadow-[0_0_8px_#ff2b2b]" />
                        ) : (
                          <span className="h-2 w-2" />
                        )}
                        #{t.number}
                      </Link>
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <Link href={`/tickets/${t.id}`} className="block truncate hover:text-rx-red2">
                        {t.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate">{c.who}</p>
                      <p className="text-xs text-white/40">
                        {c.kind} · {c.sub}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/55">
                      {t.source === "web" ? "Сайт" : "Клиент"}
                      {t.page ? <span className="block font-mono text-white/35">{t.page}</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-white/45">{fmtDate(t.createdAt)}</td>
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
