import { mockApi } from "./mock-api";
import { safeStorage } from "./storage";
import { uuid } from "./uuid";
import { type Api, ApiError, type AppNotification, type Me, type TicketPayload, type User } from "./types";

const TOKEN_KEY = "routex.accessToken";
const TIMEOUT_MS = 10_000;
const GET_RETRIES = 2;

export function getAccessToken(): string | null {
  return safeStorage.get(TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  if (token) safeStorage.set(TOKEN_KEY, token);
  else safeStorage.remove(TOKEN_KEY);
}

const trimBase = (url: string | undefined) => url?.replace(/\/$/, "") ?? "";
const apiBase = () => trimBase(process.env.NEXT_PUBLIC_API_URL);
const supportBase = () => trimBase(process.env.NEXT_PUBLIC_SUPPORT_API_URL);

async function parseError(res: Response): Promise<ApiError> {
  if (res.status === 401) return new ApiError("session_invalid");
  if (res.status === 429) return new ApiError("rate_limited");
  try {
    const body = (await res.json()) as { code?: string; message?: string };
    return new ApiError(body.code ?? "generic", body.message ?? res.statusText);
  } catch {
    return new ApiError("generic", res.statusText);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  token?: string | null;
  json?: unknown;
  body?: BodyInit;
  headers?: Record<string, string>;
};

/**
 * Таймаут на каждый запрос; GET повторяется при обрыве сети и 5xx с backoff.
 * Мутирующие запросы не повторяем — иначе можно дважды оплатить или создать тикет.
 */
async function request<T>(url: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.json !== undefined) headers["Content-Type"] = "application/json";
  const body = opts.json !== undefined ? JSON.stringify(opts.json) : opts.body;
  const attempts = method === "GET" ? GET_RETRIES + 1 : 1;

  for (let attempt = 1; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (err) {
      if (attempt < attempts) {
        await sleep(300 * 2 ** (attempt - 1));
        continue;
      }
      const timeout = err instanceof DOMException && err.name === "TimeoutError";
      throw new ApiError(timeout ? "timeout" : "network");
    }
    if (res.status >= 500 && attempt < attempts) {
      await sleep(300 * 2 ** (attempt - 1));
      continue;
    }
    if (!res.ok) throw await parseError(res);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
}

const liveApi: Api = {
  register: (payload) => request(`${apiBase()}/v1/auth/register`, { method: "POST", json: payload }),
  checkNickname: (nickname) =>
    request(`${apiBase()}/v1/auth/nickname-available?nickname=${encodeURIComponent(nickname.trim())}`),
  login: (email, password) => request(`${apiBase()}/v1/auth/login`, { method: "POST", json: { email, password } }),
  async logout() {
    const token = getAccessToken();
    if (token) await request(`${apiBase()}/v1/auth/logout`, { method: "POST", token }).catch(() => undefined);
  },
  me: (token) => request(`${apiBase()}/v1/me`, { token }),
  sessionAlive: (token) => request(`${apiBase()}/v1/me`, { token }),
  updateProfile: (token, patch) => request(`${apiBase()}/v1/me/profile`, { method: "PATCH", token, json: patch }),
  setAvatar(token, image) {
    if (!image) return request(`${apiBase()}/v1/me/avatar`, { method: "DELETE", token });
    const form = new FormData();
    form.append("file", image, "avatar.webp");
    return request(`${apiBase()}/v1/me/avatar`, { method: "PUT", token, body: form });
  },
  mockPay: (token, planCode) =>
    request(`${apiBase()}/v1/billing/mock/pay`, { method: "POST", token, json: { planCode } }),
  claimReferral: (token, code) =>
    request(`${apiBase()}/v1/billing/me/referral`, { method: "POST", token, json: { code } }),
  claimBonus: (token) => request(`${apiBase()}/v1/billing/me/bonus/claim`, { method: "POST", token }),
  listFaq: (locale) => request(`${apiBase()}/v1/support/faq?locale=${encodeURIComponent(locale)}`),
  listNotifications: (token) => request(`${apiBase()}/v1/me/notifications`, { token }),
  markNotificationsRead: (token) => request(`${apiBase()}/v1/me/notifications/read`, { method: "POST", token }),
  clearNotifications: (token) => request(`${apiBase()}/v1/me/notifications`, { method: "DELETE", token }),
  createTicket: (token, payload) =>
    request(`${apiBase()}/v1/support/tickets`, { method: "POST", token, json: payload }),
  listMyTickets: (token) => request(`${apiBase()}/v1/support/me/tickets`, { token }),
  getMyTicket: (token, id) => request(`${apiBase()}/v1/support/me/tickets/${encodeURIComponent(id)}`, { token }),
  replyMyTicket: (token, id, body) =>
    request(`${apiBase()}/v1/support/me/tickets/${encodeURIComponent(id)}/messages`, {
      method: "POST",
      token,
      json: { body },
    }),
  requestPersonalData: (token, type) =>
    request(`${apiBase()}/v1/me/data-requests`, { method: "POST", token, json: { type } }),
  deleteAccount: (token) => request(`${apiBase()}/v1/me`, { method: "DELETE", token }),
};

/**
 * Пока gateway нет, заявки идут прямо в сервис support, чтобы их видела админка.
 * Снимок пользователя берём из mock-сессии; за gateway его подставит JWT.
 */
async function createTicketDirect(token: string | null, payload: TicketPayload) {
  let user: Pick<User, "id" | "nickname" | "email"> | undefined;
  if (token) {
    const me = await mockApi.me(token);
    user = { id: me.user.id, nickname: me.user.nickname, email: me.user.email };
  }
  return request<{ id: string; number: number }>(`${supportBase()}/v1/support/tickets`, {
    method: "POST",
    json: { ...payload, user },
  });
}

/** Заголовок пользователя для support; за gateway его ставит сам gateway из JWT. */
async function asUser(token: string) {
  const me = await mockApi.me(token);
  return { "X-RouteX-User": me.user.id };
}

const supportDirect: Pick<
  Api,
  "createTicket" | "listMyTickets" | "getMyTicket" | "replyMyTicket" | "listNotifications" | "markNotificationsRead" | "clearNotifications" | "deleteAccount"
> = {
  createTicket: createTicketDirect,
  listMyTickets: async (token) => request(`${supportBase()}/v1/support/me/tickets`, { headers: await asUser(token) }),
  getMyTicket: async (token, id) =>
    request(`${supportBase()}/v1/support/me/tickets/${encodeURIComponent(id)}`, { headers: await asUser(token) }),
  replyMyTicket: async (token, id, body) =>
    request(`${supportBase()}/v1/support/me/tickets/${encodeURIComponent(id)}/messages`, {
      method: "POST",
      headers: await asUser(token),
      json: { body },
    }),
  // уведомления аккаунта (mock) + уведомления по заявкам из support в одной ленте
  async listNotifications(token) {
    const [own, support] = await Promise.all([
      mockApi.listNotifications(token),
      request<AppNotification[]>(`${supportBase()}/v1/support/me/notifications`, { headers: await asUser(token) }).catch(
        () => [] as AppNotification[],
      ),
    ]);
    return [...own, ...support].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
  },
  async markNotificationsRead(token) {
    await Promise.all([
      mockApi.markNotificationsRead(token),
      request(`${supportBase()}/v1/support/me/notifications/read`, { method: "POST", headers: await asUser(token) }).catch(
        () => undefined,
      ),
    ]);
  },
  async clearNotifications(token) {
    await Promise.all([
      mockApi.clearNotifications(token),
      request(`${supportBase()}/v1/support/me/notifications`, { method: "DELETE", headers: await asUser(token) }),
    ]);
  },
  async deleteAccount(token) {
    const headers = await asUser(token);
    await request(`${supportBase()}/v1/support/me/notifications`, { method: "DELETE", headers }).catch(() => undefined);
    await mockApi.deleteAccount(token);
  },
};

/**
 * Пока gateway нет: аккаунт — в identity, подписка и ачивки — в billing, заявки — в support.
 * Сайт сам собирает `/v1/me` и ленту уведомлений из трёх сервисов; каждый живёт и падает отдельно.
 */
const identityBase = () => trimBase(process.env.NEXT_PUBLIC_IDENTITY_API_URL);
const billingBase = () => trimBase(process.env.NEXT_PUBLIC_BILLING_API_URL);

/** ID пользователя из access-токена identity (подпись проверяют сервисы, тут только чтение). */
function userIdFromToken(token: string): string {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { sub } = JSON.parse(atob(payload)) as { sub?: string };
    if (sub) return sub;
  } catch {
    // ниже — session_invalid
  }
  throw new ApiError("session_invalid");
}

const supportAs = (token: string) => ({ "X-RouteX-User": userIdFromToken(token) });

async function feed(url: string, init: RequestOptions) {
  return request<AppNotification[]>(url, init).catch(() => [] as AppNotification[]);
}

const servicesApi: Api = {
  register: (payload) => request(`${identityBase()}/v1/auth/register`, { method: "POST", json: payload }),
  checkNickname: (nickname) =>
    request(`${identityBase()}/v1/auth/nickname-available?nickname=${encodeURIComponent(nickname.trim())}`),
  login: (email, password) =>
    request(`${identityBase()}/v1/auth/login`, { method: "POST", json: { email, password } }),
  async logout() {
    const token = getAccessToken();
    if (token) await request(`${identityBase()}/v1/auth/logout`, { method: "POST", token }).catch(() => undefined);
  },
  async me(token) {
    const [{ user }, billing] = await Promise.all([
      request<{ user: User }>(`${identityBase()}/v1/me`, { token }),
      request<Pick<Me, "subscription" | "loyalty" | "referral" | "payments">>(`${billingBase()}/v1/billing/me`, { token }),
    ]);
    return { user, ...billing };
  },
  // один запрос в identity: отозванная сессия видна сразу, без опроса billing и support
  sessionAlive: (token) => request(`${identityBase()}/v1/me`, { token }),
  updateProfile: (token, patch) =>
    request(`${identityBase()}/v1/me/profile`, { method: "PATCH", token, json: patch }),
  setAvatar(token, image) {
    if (!image) return request(`${identityBase()}/v1/me/avatar`, { method: "DELETE", token });
    const form = new FormData();
    form.append("file", image, "avatar.webp");
    return request(`${identityBase()}/v1/me/avatar`, { method: "PUT", token, body: form });
  },
  mockPay: (token, planCode) =>
    request(`${billingBase()}/v1/billing/mock/pay`, {
      method: "POST",
      token,
      json: { planCode, idempotencyKey: uuid() },
    }),
  claimReferral: async (token, code) => {
    if (!code.trim()) return;
    await request(`${billingBase()}/v1/billing/me/referral`, { method: "POST", token, json: { code: code.trim() } });
  },
  claimBonus: (token) => request(`${billingBase()}/v1/billing/me/bonus/claim`, { method: "POST", token }),
  listFaq: (locale) => mockApi.listFaq(locale),
  async createTicket(token, payload) {
    let user: Pick<User, "id" | "nickname" | "email"> | undefined;
    if (token) {
      const { user: u } = await request<{ user: User }>(`${identityBase()}/v1/me`, { token });
      user = { id: u.id, nickname: u.nickname, email: u.email };
    }
    return request(`${supportBase()}/v1/support/tickets`, { method: "POST", json: { ...payload, user } });
  },
  listMyTickets: async (token) => request(`${supportBase()}/v1/support/me/tickets`, { headers: supportAs(token) }),
  getMyTicket: async (token, id) =>
    request(`${supportBase()}/v1/support/me/tickets/${encodeURIComponent(id)}`, { headers: supportAs(token) }),
  replyMyTicket: async (token, id, body) =>
    request(`${supportBase()}/v1/support/me/tickets/${encodeURIComponent(id)}/messages`, {
      method: "POST",
      headers: supportAs(token),
      json: { body },
    }),
  requestPersonalData: async () => ({ id: uuid() }),
  async listNotifications(token) {
    // identity — источник правды о сессии: его 401 должен разлогинить, остальные ленты необязательны
    const [own, billing, support] = await Promise.all([
      request<AppNotification[]>(`${identityBase()}/v1/me/notifications`, { token }),
      feed(`${billingBase()}/v1/billing/me/notifications`, { token }),
      feed(`${supportBase()}/v1/support/me/notifications`, { headers: supportAs(token) }),
    ]);
    return [...own, ...billing, ...support].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
  },
  async markNotificationsRead(token) {
    await Promise.all([
      request(`${identityBase()}/v1/me/notifications/read`, { method: "POST", token }),
      request(`${billingBase()}/v1/billing/me/notifications/read`, { method: "POST", token }).catch(() => undefined),
      request(`${supportBase()}/v1/support/me/notifications/read`, { method: "POST", headers: supportAs(token) }).catch(
        () => undefined,
      ),
    ]);
  },
  async clearNotifications(token) {
    await Promise.all([
      request(`${identityBase()}/v1/me/notifications`, { method: "DELETE", token }),
      request(`${billingBase()}/v1/billing/me/notifications`, { method: "DELETE", token }),
      request(`${supportBase()}/v1/support/me/notifications`, { method: "DELETE", headers: supportAs(token) }),
    ]);
  },
  /** Сначала данные в billing и support, аккаунт — последним: после него токен уже недействителен. */
  async deleteAccount(token) {
    await request(`${billingBase()}/v1/billing/me`, { method: "DELETE", token });
    await request(`${supportBase()}/v1/support/me/notifications`, { method: "DELETE", headers: supportAs(token) }).catch(
      () => undefined,
    );
    await request(`${identityBase()}/v1/me`, { method: "DELETE", token });
  },
};

export const usesLiveApi = Boolean(apiBase());
export const usesServices = !usesLiveApi && Boolean(identityBase() && billingBase());
export const usesSupportApi = usesLiveApi || Boolean(supportBase());
export const clientApi: Api = usesLiveApi
  ? liveApi
  : usesServices
    ? servicesApi
    : supportBase()
      ? { ...mockApi, ...supportDirect }
      : mockApi;
