import { headers } from "next/headers";

/** Событие админки в журнал. Только сервер; журнал недоступен — действие всё равно выполняется. */
export async function auditAdmin(e: {
  type: "admin.login" | "admin.login_failed" | "admin.logout";
  actor: string;
  userId?: string;
  meta?: Record<string, unknown>;
}) {
  const base = process.env.AUDIT_URL?.replace(/\/$/, "");
  const token = process.env.AUDIT_INGEST_TOKEN;
  if (!base || !token) return;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
  await fetch(`${base}/v1/audit/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    // staff id — не UUID клиента, поэтому в targetId, а не в userId
    body: JSON.stringify({ source: "admin", service: "admin", type: e.type, actor: e.actor, targetId: e.userId, ip, meta: e.meta }),
    signal: AbortSignal.timeout(2000),
  }).catch(() => undefined);
}
