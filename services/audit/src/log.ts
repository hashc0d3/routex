import { randomUUID } from "node:crypto";
import type { LoggerService } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

/**
 * Одна строка JSON на событие в stdout — формат общий для всех сервисов RouteX,
 * Alloy забирает его из Docker и кладёт в Loki (метки: service, level).
 * Держать в синхроне с services/support/src/log.ts.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

const SERVICE = process.env.SERVICE_NAME ?? "audit";
const SECRET_KEY = /pass(word)?|token|secret|authorization|cookie|^body$|^text$|^message_?body$/i;
const MAX_STRING = 500;

export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return "***";
  return `${name.slice(0, 2)}***@${domain}`;
}

export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length < 6 ? "***" : `+${digits.slice(0, 2)}***${digits.slice(-2)}`;
}

/** Вычищает секреты и персональные данные из произвольных полей перед записью. */
export function redact(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return maskEmail(value);
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  }
  if (depth > 3) return "[deep]";
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
      if (SECRET_KEY.test(k)) out[k] = "[redacted]";
      else if (/phone/i.test(k) && typeof v === "string") out[k] = maskPhone(v);
      else out[k] = redact(v, depth + 1);
    }
    return out;
  }
  return String(value);
}

export function log(level: LogLevel, msg: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: SERVICE,
    msg,
    ...(redact(fields) as Record<string, unknown>),
  });
  (level === "error" ? process.stderr : process.stdout).write(`${line}\n`);
}

/** Подменяет стандартный логгер Nest, чтобы и его сообщения шли тем же JSON. */
export class JsonLogger implements LoggerService {
  log(message: unknown, context?: string) {
    log("info", String(message), { context });
  }
  error(message: unknown, trace?: string, context?: string) {
    log("error", String(message), { context, stack: trace });
  }
  warn(message: unknown, context?: string) {
    log("warn", String(message), { context });
  }
  debug(message: unknown, context?: string) {
    if (process.env.LOG_LEVEL === "debug") log("debug", String(message), { context });
  }
  verbose(message: unknown, context?: string) {
    this.debug(message, context);
  }
}

const REQUEST_ID_RE = /^[\w.-]{8,64}$/;

/** X-Request-Id сквозной: берём пришедший (от gateway/сайта/админки) или выдаём новый. */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers["x-request-id"];
  const requestId = typeof incoming === "string" && REQUEST_ID_RE.test(incoming) ? incoming : randomUUID();
  req.headers["x-request-id"] = requestId;
  res.setHeader("X-Request-Id", requestId);
  const started = process.hrtime.bigint();
  res.on("finish", () => {
    if (req.path === "/health") return;
    const status = res.statusCode;
    log(status >= 500 ? "error" : status >= 400 ? "warn" : "info", "http", {
      requestId,
      method: req.method,
      path: req.path,
      status,
      ms: Math.round(Number(process.hrtime.bigint() - started) / 1e6),
    });
  });
  next();
}
