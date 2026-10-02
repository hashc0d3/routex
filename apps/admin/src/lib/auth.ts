export const SESSION_COOKIE = "rx_admin";
export const SESSION_TTL_S = 60 * 60 * 12;
// по http (без домена/сертификата) secure-cookie браузер не сохранит — тогда ADMIN_COOKIE_SECURE=false
export const SESSION_COOKIE_SECURE = process.env.ADMIN_COOKIE_SECURE
  ? process.env.ADMIN_COOKIE_SECURE === "true"
  : process.env.NODE_ENV === "production";

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(data: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("ADMIN_SESSION_SECRET must be 32+ chars");
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SessionClaims = { staffId: string; version: number };

/**
 * Cookie вида `staffId.version.exp.hmac` — проверяется и в middleware (edge), и на сервере.
 * Роль в cookie не кладём: её читаем из БД на каждый запрос, чтобы смена роли и блокировка действовали сразу.
 */
export async function createSession(staffId: string, version: number) {
  const payload = `${staffId}.${version}.${Math.floor(Date.now() / 1000) + SESSION_TTL_S}`;
  return `${payload}.${await sign(payload)}`;
}

export async function verifySession(value: string | undefined): Promise<SessionClaims | null> {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [staffId, version, exp, sig] = parts;
  if (!UUID_RE.test(staffId) || !/^\d+$/.test(version)) return null;
  if (!safeEqual(sig, await sign(`${staffId}.${version}.${exp}`))) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return { staffId, version: Number(version) };
}
