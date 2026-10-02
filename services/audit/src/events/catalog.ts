import type { AuditLevel } from "../../generated/client";

type EventSpec = {
  level?: AuditLevel;
  /** Можно присылать с сайта/клиента через /v1/audit/client-events (пока нет gateway). */
  client?: boolean;
  /** Клиентское событие без пользователя (например, неудачный вход). */
  anonymous?: boolean;
};

/**
 * Каталог событий. Неизвестный type отклоняется — так журнал не превращается в свалку.
 * Подписи для людей — в apps/admin/src/lib/audit.ts.
 */
export const EVENTS: Record<string, EventSpec> = {
  "user.registered": { client: true },
  "user.nickname_changed": { client: true },
  "user.avatar_changed": { client: true },
  "user.deleted": { client: true, level: "warn" },
  "auth.login": { client: true },
  "auth.login_failed": { client: true, anonymous: true, level: "warn" },
  "auth.logout": { client: true },
  "subscription.purchased": { client: true },
  "subscription.renewed": { client: true },
  "session.started": { client: true },
  "session.ended": { client: true },
  "ticket.created": {},
  "ticket.message": {},
  "ticket.status_changed": {},
  "admin.login": {},
  "admin.login_failed": { level: "warn" },
  "admin.logout": {},
  "service.error": { level: "error" },
};

export const EVENT_TYPES = Object.keys(EVENTS);
export const CLIENT_EVENT_TYPES = EVENT_TYPES.filter((t) => EVENTS[t].client);
