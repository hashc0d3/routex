import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db } from "./db";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

// Без «$»: Next раскрывает $VAR в .env-файлах
const DUMMY = "scrypt:AAAAAAAAAAAAAAAAAAAAAA==:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export const PASSWORD_MIN = 10;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 32);
  return `scrypt:${salt.toString("base64")}:${hash.toString("base64")}`;
}

export async function verifyHash(password: string, stored: string) {
  const [alg, saltB64, hashB64] = stored.split(":");
  if (alg !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const got = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** Пароль, который удобно продиктовать: без похожих символов (0/O, 1/l/I). */
export function generatePassword(length = 14) {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Пароль — минимум ${PASSWORD_MIN} символов`;
  if (password.length > 128) return "Пароль слишком длинный";
  if (!/[A-Za-zА-Яа-я]/.test(password) || !/\d/.test(password)) return "Пароль должен содержать буквы и цифры";
  return null;
}

/**
 * Владельцы из ADMIN_USERS ("email=scrypt:<salt>:<hash>;…", записи делает scripts/hash-password.mjs)
 * при каждом старте процесса: нет в БД — создаём; есть — возвращаем super admin и снимаем блокировку.
 * Пароль из env ставится только при создании, чтобы смена пароля в профиле не откатывалась.
 */
let bootstrapped: Promise<void> | null = null;
export function ensureBootstrap() {
  bootstrapped ??= (async () => {
    const rows = (process.env.ADMIN_USERS ?? "")
      .split(";")
      .map((entry) => {
        const i = entry.indexOf("=");
        return i > 0 ? { email: entry.slice(0, i).trim().toLowerCase(), hash: entry.slice(i + 1).trim() } : null;
      })
      .filter((r): r is { email: string; hash: string } => Boolean(r?.email && r.hash.startsWith("scrypt:")));
    for (const r of rows) {
      const existing = await db.staffUser.findUnique({ where: { email: r.email }, select: { role: true, active: true } });
      if (!existing) {
        await db.staffUser.create({
          data: { email: r.email, name: r.email.split("@")[0], role: "super_admin", passwordHash: r.hash },
        });
      } else if (existing.role !== "super_admin" || !existing.active) {
        // смена роли/разблокировка — новая версия сессии, чтобы старые cookie перечитали права
        await db.staffUser.update({
          where: { email: r.email },
          data: { role: "super_admin", active: true, sessionVersion: { increment: 1 } },
        });
      }
    }
  })().catch((err) => {
    bootstrapped = null;
    throw err;
  });
  return bootstrapped;
}

export async function checkCredentials(email: string, password: string) {
  await ensureBootstrap();
  const user = await db.staffUser.findUnique({ where: { email: email.trim().toLowerCase() } });
  // хеш считаем и для неизвестного email, чтобы по времени ответа нельзя было перебрать сотрудников
  const ok = await verifyHash(password, user?.passwordHash ?? DUMMY);
  if (!user || !ok) return { ok: false as const, reason: "credentials" as const };
  if (!user.active) return { ok: false as const, reason: "blocked" as const };
  return { ok: true as const, user };
}
