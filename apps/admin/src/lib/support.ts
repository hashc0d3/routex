export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";

export type Ticket = {
  id: string;
  number: number;
  source: "web" | "app";
  status: TicketStatus;
  subject: string;
  userId: string | null;
  userNickname: string | null;
  userEmail: string | null;
  contactPhone: string | null;
  contactNickname: string | null;
  locale: string;
  page: string | null;
  pdConsentAt: string | null;
  attachOk: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TicketMessage = {
  id: string;
  /** system: смена статуса, body = новый статус */
  author: "user" | "staff" | "system";
  authorName: string | null;
  body: string;
  createdAt: string;
};

export type TicketList = {
  /** unread — пользователь написал после того, как поддержка последний раз открывала заявку */
  items: (Ticket & { _count: { messages: number }; unread: boolean })[];
  total: number;
  page: number;
  take: number;
  counts: Record<TicketStatus, number>;
};

export const STATUSES: { id: TicketStatus; label: string; tone: string }[] = [
  { id: "open", label: "Новая", tone: "border-rx-red/60 bg-rx-red/15 text-rx-red2" },
  { id: "in_progress", label: "В работе", tone: "border-amber-400/50 bg-amber-400/10 text-amber-300" },
  { id: "waiting", label: "Ждёт ответа", tone: "border-sky-400/50 bg-sky-400/10 text-sky-300" },
  { id: "resolved", label: "Решена", tone: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" },
  { id: "closed", label: "Закрыта", tone: "border-white/15 bg-white/5 text-white/50" },
];

export const statusOf = (id: TicketStatus) => STATUSES.find((s) => s.id === id) ?? STATUSES[0];

export class SupportUnavailable extends Error {}

/** Только сервер: токен админки не должен попасть в браузер. */
async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = process.env.SUPPORT_API_URL?.replace(/\/$/, "");
  const token = process.env.ADMIN_API_TOKEN;
  if (!base || !token) throw new SupportUnavailable("SUPPORT_API_URL / ADMIN_API_TOKEN не заданы");
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new SupportUnavailable("Сервис support недоступен");
  }
  if (res.status === 404) throw new Error("not_found");
  if (!res.ok) throw new SupportUnavailable(`support ответил ${res.status}`);
  return res.json() as Promise<T>;
}

export function listTickets(params: { status?: string; q?: string; page?: number; take?: number }) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.q) qs.set("q", params.q);
  if (params.page) qs.set("page", String(params.page));
  if (params.take) qs.set("take", String(params.take));
  return call<TicketList>(`/v1/admin/tickets?${qs}`);
}

export function getTicket(id: string) {
  return call<Ticket & { messages: TicketMessage[] }>(`/v1/admin/tickets/${encodeURIComponent(id)}`);
}

export function setTicketStatus(id: string, status: TicketStatus) {
  return call<Ticket>(`/v1/admin/tickets/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function addStaffMessage(id: string, body: string, authorName: string) {
  return call<TicketMessage>(`/v1/admin/tickets/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    body: JSON.stringify({ body, authorName }),
  });
}

export async function supportHealth() {
  const base = process.env.SUPPORT_API_URL?.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/health`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export function contactOf(t: Ticket) {
  if (t.userNickname) return { who: t.userNickname, sub: t.userEmail ?? "", kind: "Аккаунт" };
  if (t.contactPhone) return { who: t.contactPhone, sub: "телефон", kind: "Гость" };
  return { who: t.contactNickname ?? "—", sub: "ник", kind: "Гость" };
}

export const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Moscow" }).format(
    new Date(iso),
  );
