import type { SubscriptionStatus } from "./clients-shared";

/** Клиенты сайта живут в identity, подписки — в billing. Ходим к ним только с сервера админки. */

export type ClientRow = {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  deletedAt: string | null;
};

export type ClientList = { items: ClientRow[]; total: number; page: number; take: number };

export type ClientDetail = ClientRow & {
  updatedAt: string;
  sessions: { id: string; ip: string | null; userAgent: string | null; createdAt: string; lastSeenAt: string; active: boolean }[];
  consents: { type: string; version: string; accepted: boolean; createdAt: string }[];
};

export type SubscriptionView = {
  status: SubscriptionStatus;
  planCode: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string;
};

export type BillingSummary = SubscriptionView & { monthsTogether: number };

export type BillingDetail = {
  subscription: SubscriptionView | null;
  monthsTogether: number;
  achievements: { code: string; unlockedAt: string }[];
  payments: {
    id: string;
    planCode: string;
    provider: string;
    status: "pending" | "succeeded" | "failed";
    amountMinor: number;
    currency: string;
    createdAt: string;
  }[];
};

export class ServiceUnavailable extends Error {
  constructor(
    public readonly service: "identity" | "billing",
    message: string,
  ) {
    super(message);
  }
}

const BASES = {
  identity: () => process.env.IDENTITY_API_URL?.replace(/\/$/, ""),
  billing: () => process.env.BILLING_API_URL?.replace(/\/$/, ""),
};

async function call<T>(service: keyof typeof BASES, path: string, init: RequestInit = {}): Promise<T> {
  const base = BASES[service]();
  const token = process.env.ADMIN_API_TOKEN;
  if (!base || !token) throw new ServiceUnavailable(service, `${service.toUpperCase()}_API_URL / ADMIN_API_TOKEN не заданы`);
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new ServiceUnavailable(service, `Сервис ${service} недоступен`);
  }
  if (res.status === 404) throw new Error("not_found");
  if (!res.ok) throw new ServiceUnavailable(service, `${service} ответил ${res.status}`);
  return res.json() as Promise<T>;
}

export function listClients(params: { q?: string; page?: number; take?: number; state?: string }) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.page) qs.set("page", String(params.page));
  if (params.take) qs.set("take", String(params.take));
  if (params.state) qs.set("state", params.state);
  return call<ClientList>("identity", `/v1/admin/users?${qs}`);
}

export function getClient(id: string) {
  return call<ClientDetail>("identity", `/v1/admin/users/${encodeURIComponent(id)}`);
}

export function revokeClientSessions(id: string) {
  return call<{ revoked: number }>("identity", `/v1/admin/users/${encodeURIComponent(id)}/sessions/revoke`, {
    method: "POST",
  });
}

export function clientStats() {
  return call<{ total: number; new24h: number; new7d: number; online24h: number }>("identity", "/v1/admin/users/stats");
}

/** Подписки для страницы списка одним запросом. billing недоступен — список всё равно показываем. */
export function billingLookup(userIds: string[]) {
  if (userIds.length === 0) return Promise.resolve({} as Record<string, BillingSummary>);
  return call<Record<string, BillingSummary>>("billing", "/v1/admin/billing/lookup", {
    method: "POST",
    body: JSON.stringify({ userIds }),
  });
}

export function billingOf(userId: string) {
  return call<BillingDetail>("billing", `/v1/admin/billing/users/${encodeURIComponent(userId)}`);
}

export function billingStats() {
  return call<{ active: number; trial: number; expired: number; payments30d: number; revenue30dMinor: number }>(
    "billing",
    "/v1/admin/billing/stats",
  );
}

export async function serviceHealth(service: keyof typeof BASES) {
  const base = BASES[service]();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/health`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
