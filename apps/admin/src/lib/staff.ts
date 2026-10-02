import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SESSION_COOKIE, verifySession } from "./auth";
import { db } from "./db";
import { can, homeFor, type Permission, type Role } from "./rbac";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Staff = { id: string; email: string; name: string; role: Role };

/** Текущий сотрудник по cookie — с проверкой в БД (активен, версия сессии совпадает). Кэш на запрос. */
export const currentStaff = cache(async (): Promise<Staff | null> => {
  const claims = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  const user = await db.staffUser.findUnique({ where: { id: claims.staffId } });
  if (!user || !user.active || user.sessionVersion !== claims.version) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
});

/**
 * Для страниц и server actions. Нет сессии (или сотрудника заблокировали) — на /session-end,
 * он удалит cookie; нет права — на «домашнюю» страницу роли.
 */
export async function requireStaff(permission?: Permission): Promise<Staff> {
  const staff = await currentStaff();
  if (!staff) redirect("/session-end");
  if (permission && !can(staff.role, permission)) redirect(homeFor(staff.role));
  return staff;
}
