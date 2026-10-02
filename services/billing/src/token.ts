import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Access-токен выдаёт identity: JWT HS256 `{ sub: userId, sid: sessionId, exp }`.
 * billing только проверяет подпись общим AUTH_TOKEN_SECRET — без запроса в identity,
 * поэтому выход из аккаунта здесь действует лишь по истечении exp (за gateway это уйдёт).
 */
export type AccessClaims = { sub: string; sid: string; exp: number };

const HEADER = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");

function secret() {
  const s = process.env.AUTH_TOKEN_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_TOKEN_SECRET не задан или короче 32 символов");
  return s;
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
