import { PrismaClient } from "../../generated/client";

const globalForPrisma = globalThis as unknown as { staffDb?: PrismaClient };

// В dev Next перезагружает модули — держим один клиент на процесс
export const db = globalForPrisma.staffDb ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.staffDb = db;
