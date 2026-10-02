/**
 * Событие в журнал (services/audit). Без ожидания и без исключений: журнал недоступен —
 * основная операция всё равно проходит, событие теряется (позже — outbox).
 */
export type AuditEvent = {
  type: string;
  level?: "info" | "warn" | "error";
  userId?: string | null;
  actor?: string | null;
  targetId?: string | null;
  ip?: string | null;
  meta?: Record<string, unknown>;
};

export function audit(e: AuditEvent) {
  const base = process.env.AUDIT_URL?.replace(/\/$/, "");
  const token = process.env.AUDIT_INGEST_TOKEN;
  if (!base || !token) return;
  const body = {
    source: "service",
    service: process.env.SERVICE_NAME ?? "identity",
    type: e.type,
    level: e.level,
    userId: e.userId ?? undefined,
    actor: e.actor ?? undefined,
    targetId: e.targetId ?? undefined,
    ip: e.ip ?? undefined,
    meta: e.meta,
  };
  void fetch(`${base}/v1/audit/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3000),
  })
    .then((r) => {
      if (!r.ok) console.warn(`audit ${e.type}: ${r.status}`);
    })
    .catch(() => undefined);
}
