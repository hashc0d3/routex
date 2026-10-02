"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, SESSION_COOKIE, SESSION_TTL_S } from "@/lib/auth";
import { db } from "@/lib/db";
import { ASSIGNABLE_ROLES, canManage, type Role } from "@/lib/rbac";
import { requireStaff } from "@/lib/staff";
import { generatePassword, hashPassword, passwordProblem, verifyHash } from "@/lib/users";

export type FormState = { error: string | null; ok?: string; password?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readRole(form: FormData): Role | null {
  const role = String(form.get("role") ?? "");
  return (ASSIGNABLE_ROLES as string[]).includes(role) ? (role as Role) : null;
}

function readName(form: FormData) {
  return String(form.get("name") ?? "").trim().replace(/\s+/g, " ");
}

/** Цель действия + проверка, что super admin вправе её трогать (не super admin и не он сам). */
async function managedTarget(form: FormData) {
  const actor = await requireStaff("staff");
  const id = String(form.get("id") ?? "");
  const target = await db.staffUser.findUnique({ where: { id } });
  if (!target) return { error: "Сотрудник не найден" } as const;
  if (!canManage(actor, target)) return { error: "Этого сотрудника нельзя изменять" } as const;
  return { actor, target } as const;
}

export async function createStaff(_: FormState, form: FormData): Promise<FormState> {
  const actor = await requireStaff("staff");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = readName(form);
  const role = readRole(form);
  const generate = form.get("generate") === "on";
  const password = generate ? generatePassword() : String(form.get("password") ?? "");

  if (!EMAIL_RE.test(email)) return { error: "Укажите корректный email" };
  if (name.length < 2 || name.length > 64) return { error: "Имя — от 2 до 64 символов" };
  if (!role) return { error: "Выберите роль — без роли сотрудника создать нельзя" };
  const weak = passwordProblem(password);
  if (weak) return { error: weak };
  if (await db.staffUser.findUnique({ where: { email } })) return { error: "Сотрудник с таким email уже есть" };

  await db.staffUser.create({
    data: { email, name, role, passwordHash: await hashPassword(password), createdById: actor.id },
  });
  revalidatePath("/staff");
  return { error: null, ok: `Сотрудник ${email} создан`, password: generate ? password : undefined };
}

export async function updateStaff(_: FormState, form: FormData): Promise<FormState> {
  const res = await managedTarget(form);
  if ("error" in res) return { error: res.error ?? null };
  const { target } = res;
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = readName(form);
  const role = readRole(form);
  const active = form.get("active") === "on";

  if (!EMAIL_RE.test(email)) return { error: "Укажите корректный email" };
  if (name.length < 2 || name.length > 64) return { error: "Имя — от 2 до 64 символов" };
  if (!role) return { error: "Выберите роль" };
  if (email !== target.email && (await db.staffUser.findUnique({ where: { email } }))) {
    return { error: "Сотрудник с таким email уже есть" };
  }

  // доступ сужается — старые сессии больше не годятся
  const revoke = role !== target.role || (target.active && !active) || email !== target.email;
  await db.staffUser.update({
    where: { id: target.id },
    data: { email, name, role, active, ...(revoke ? { sessionVersion: { increment: 1 } } : {}) },
  });
  revalidatePath("/staff");
  revalidatePath(`/staff/${target.id}`);
  return { error: null, ok: "Изменения сохранены" };
}

export async function resetStaffPassword(_: FormState, form: FormData): Promise<FormState> {
  const res = await managedTarget(form);
  if ("error" in res) return { error: res.error ?? null };
  const password = generatePassword();
  await db.staffUser.update({
    where: { id: res.target.id },
    data: { passwordHash: await hashPassword(password), sessionVersion: { increment: 1 } },
  });
  return { error: null, ok: "Пароль сброшен, сотрудник разлогинен", password };
}

export async function deleteStaff(form: FormData) {
  const res = await managedTarget(form);
  if ("error" in res) return;
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== res.target.email) return;
  await db.staffUser.delete({ where: { id: res.target.id } });
  revalidatePath("/staff");
  redirect("/staff");
}

/** Свой пароль — любой сотрудник; остальные сессии разлогиниваются, текущая обновляется. */
export async function changeOwnPassword(_: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const repeat = String(form.get("repeat") ?? "");
  const user = await db.staffUser.findUniqueOrThrow({ where: { id: staff.id } });

  if (!(await verifyHash(current, user.passwordHash))) return { error: "Текущий пароль указан неверно" };
  const weak = passwordProblem(next);
  if (weak) return { error: weak };
  if (next !== repeat) return { error: "Новые пароли не совпадают" };
  if (next === current) return { error: "Новый пароль совпадает с текущим" };

  const updated = await db.staffUser.update({
    where: { id: staff.id },
    data: { passwordHash: await hashPassword(next), sessionVersion: { increment: 1 } },
  });
  (await cookies()).set(SESSION_COOKIE, await createSession(updated.id, updated.sessionVersion), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_S,
  });
  return { error: null, ok: "Пароль изменён. На других устройствах нужно войти заново." };
}
