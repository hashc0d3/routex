// Использование: node scripts/hash-password.mjs <email> <пароль>
// Печатает запись для ADMIN_USERS (несколько записей разделяются «;»).
import { randomBytes, scryptSync } from "node:crypto";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("usage: node scripts/hash-password.mjs <email> <password>");
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 32);
console.log(`${email.toLowerCase()}=scrypt:${salt.toString("base64")}:${hash.toString("base64")}`);
