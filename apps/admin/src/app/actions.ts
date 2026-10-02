"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, SESSION_COOKIE, SESSION_COOKIE_SECURE, SESSION_TTL_S } from "@/lib/auth";
import { db } from "@/lib/db";
import { homeFor } from "@/lib/rbac";
import { auditAdmin } from "@/lib/audit-emit";
import { currentStaff, requireStaff } from "@/lib/staff";
import { addStaffMessage, setTicketStatus, type TicketStatus } from "@/lib/support";
import { checkCredentials } from "@/lib/users";

export type LoginState = { error: string | null };

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "");
  const res = await checkCredentials(email, password);
  if (!res.ok) {
    await auditAdmin({ type: "admin.login_failed", actor: email.slice(0, 128), meta: { reason: res.reason } });
    await new Promise((r) => setTimeout(r, 600));
    return { error: res.reason === "blocked" ? "Учётная запись заблокирована" : "Неверный email или пароль" };
  }
  await db.staffUser.update({ where: { id: res.user.id }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(SESSION_COOKIE, await createSession(res.user.id, res.user.sessionVersion), {
    httpOnly: true,
    sameSite: "strict",
    secure: SESSION_COOKIE_SECURE,
    path: "/",
    maxAge: SESSION_TTL_S,
  });
  await auditAdmin({ type: "admin.login", actor: res.user.email, userId: res.user.id, meta: { role: res.user.role } });
  // недоступный роли `next` всё равно отрежет requireStaff на самой странице
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : homeFor(res.user.role));
}

export async function logout() {
  const staff = await currentStaff();
  if (staff) await auditAdmin({ type: "admin.logout", actor: staff.email, userId: staff.id });
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function changeStatus(form: FormData) {
  await requireStaff("tickets");
  const id = String(form.get("id"));
  await setTicketStatus(id, String(form.get("status")) as TicketStatus);
  revalidatePath(`/tickets/${id}`);
  revalidatePath("/tickets");
}

export async function reply(form: FormData) {
  const staff = await requireStaff("tickets");
  const id = String(form.get("id"));
  const body = String(form.get("body") ?? "").trim();
  if (!body) return;
  await addStaffMessage(id, body, staff.name || staff.email);
  revalidatePath(`/tickets/${id}`);
}
