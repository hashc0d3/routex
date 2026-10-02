import Link from "next/link";
import { logout } from "../actions";
import { can, ROLE_INFO } from "@/lib/rbac";
import { requireStaff } from "@/lib/staff";
import { listTickets } from "@/lib/support";
import { NavLink } from "./NavLink";

const SOON = ["Подписки", "Релеи и PoP", "Клиент Windows", "Сайт и контент"];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const role = ROLE_INFO[staff.role];
  const open = can(staff.role, "tickets")
    ? await listTickets({ take: 1 })
        .then((r) => r.counts.open)
        .catch(() => null)
    : null;
  const full = can(staff.role, "overview");

  return (
    <div className="flex min-h-[100dvh]">
      <aside className="sticky top-0 flex h-[100dvh] w-60 shrink-0 flex-col border-r border-white/10 bg-rx-panel">
        <Link href={full ? "/" : "/tickets"} className="block px-5 py-5 font-display text-2xl uppercase">
          Route<span className="text-rx-red">X</span> <span className="text-sm text-white/40">Admin</span>
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 text-sm">
          {full ? (
            <NavLink href="/" exact>
              Обзор
            </NavLink>
          ) : null}
          {can(staff.role, "tickets") ? (
            <NavLink href="/tickets" badge={open ?? undefined}>
              Заявки
            </NavLink>
          ) : null}
          {can(staff.role, "clients") ? <NavLink href="/clients">Клиенты</NavLink> : null}
          {can(staff.role, "staff") ? <NavLink href="/staff">Администраторы</NavLink> : null}
          {full ? (
            <>
              <p className="px-3 pb-1 pt-5 text-[10px] uppercase tracking-[0.2em] text-white/30">Скоро</p>
              {SOON.map((s) => (
                <span key={s} className="block cursor-not-allowed px-3 py-2 text-white/30">
                  {s}
                </span>
              ))}
            </>
          ) : null}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-xs">
          <Link href="/profile" className="group block">
            <p className="truncate text-sm font-semibold text-white/85 group-hover:text-white">{staff.name}</p>
            <p className="truncate text-white/45">{staff.email}</p>
          </Link>
          <span className={`mt-2 inline-block border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${role.tone}`}>
            {role.label}
          </span>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/profile" className="btn btn-sm btn-ghost px-2">
              Пароль
            </Link>
            <form action={logout} className="contents">
              <button className="btn btn-sm btn-danger px-2">Выйти</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
