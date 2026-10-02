import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Access-токен — JWT HS256 `{ sub: userId, sid: sessionId, exp }`.
 * Секрет AUTH_TOKEN_SECRET общий с billing: тот проверяет подпись сам, не обращаясь к identity.
 * Отзыв по sid проверяет только identity; за gateway проверка переедет туда.
 */
export type AccessClaims = { sub: string; sid: string; exp: number };

export const TOKEN_TTL_DAYS = 30;

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");

function secret() {
  const s = process.env.AUTH_TOKEN_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_TOKEN_SECRET не задан или короче 32 символов");
  return s;
}

const HEADER = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));

export function signAccess(claims: AccessClaims): string {
  const body = `${HEADER}.${b64url(JSON.stringify(claims))}`;
  return `${body}.${createHmac("sha256", secret()).update(body).digest("base64url")}`;
}

export function verifyAccess(token: string): AccessClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== HEADER) return null;
  const expected = createHmac("sha256", secret()).update(`${parts[0]}.${parts[1]}`).digest();
  const got = Buffer.from(parts[2], "base64url");
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as AccessClaims;
    if (typeof claims.sub !== "string" || typeof claims.sid !== "string" || typeof claims.exp !== "number") return null;
    return claims.exp * 1000 > Date.now() ? claims : null;
  } catch {
    return null;
  }
}
