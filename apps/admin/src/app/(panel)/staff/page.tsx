import Link from "next/link";
import { db } from "@/lib/db";
import { canManage, ROLES } from "@/lib/rbac";
import { requireStaff } from "@/lib/staff";
import { fmtDate } from "@/lib/support";
import { ActionLink, PageTitle, RoleBadge } from "../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Администраторы" };

export default async function UsersPage() {
  const me = await requireStaff("staff");
  const users = await db.staffUser.findMany({ orderBy: [{ createdAt: "asc" }] });
  // super admin сверху, дальше admin, operator
  users.sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle sub="Учётные записи админки и их роли. Клиенты сайта — отдельные аккаунты в identity.">
          Администраторы
        </PageTitle>
        <Link href="/staff/new" className="btn btn-primary">
          <span className="text-base leading-none">+</span> Новый сотрудник
        </Link>
      </div>

      <div className="overflow-x-auto border border-white/10">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-[0.15em] text-white/40">
            <tr>
              <th className="px-4 py-3 font-medium">Сотрудник</th>
              <th className="px-4 py-3 font-medium">Роль</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium">Последний вход</th>
              <th className="px-4 py-3 font-medium">Создан</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => {
              const editable = canManage(me, u);
              return (
                <tr key={u.id} className={u.active ? "" : "opacity-55"}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">
                      {u.name}
                      {u.id === me.id ? <span className="ml-2 text-xs font-normal text-white/40">это вы</span> : null}
                    </p>
                    <p className="text-xs text-white/45">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    {u.active ? (
                      <span className="text-emerald-300">Активен</span>
                    ) : (
                      <span className="text-rx-red2">Заблокирован</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/60">{u.lastLoginAt ? fmtDate(u.lastLoginAt.toISOString()) : "—"}</td>
                  <td className="px-4 py-3 text-white/60">{fmtDate(u.createdAt.toISOString())}</td>
                  <td className="px-4 py-3 text-right">
                    {editable ? (
                      <ActionLink href={`/staff/${u.id}`}>Изменить</ActionLink>
                    ) : u.id === me.id ? (
                      <ActionLink href="/profile">Профиль</ActionLink>
                    ) : (
                      <span
                        title="Super admin нельзя изменить из интерфейса"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white/30"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <rect x="5" y="11" width="14" height="10" />
                          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                        </svg>
                        Защищён
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-white/40">
        Super admin нельзя изменить или удалить из интерфейса. Свой пароль каждый меняет в профиле.
      </p>
    </>
  );
}
