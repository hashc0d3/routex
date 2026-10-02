"use server";

import { revalidatePath } from "next/cache";
import { revokeClientSessions } from "@/lib/clients";
import { requireStaff } from "@/lib/staff";

export type RevokeState = { ok?: string; error: string | null };

export async function revokeSessions(_: RevokeState, form: FormData): Promise<RevokeState> {
  await requireStaff("clients");
  const id = String(form.get("id") ?? "");
  try {
    const { revoked } = await revokeClientSessions(id);
    revalidatePath(`/clients/${id}`);
    return {
      error: null,
      ok: revoked ? `Завершено сессий: ${revoked}. Клиенту нужно войти заново.` : "Активных сессий не было.",
    };
  } catch {
    return { error: "Сервис identity не ответил — попробуй ещё раз." };
  }
}
