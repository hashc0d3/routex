import { CanActivate, createParamDecorator, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";

function bearerMatches(req: Request, expected: string | undefined) {
  const header = req.headers.authorization ?? "";
  const got = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!expected || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Чтение журнала — только сервер админки (`ADMIN_API_TOKEN`). */
@Injectable()
export class AdminTokenGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    if (!bearerMatches(ctx.switchToHttp().getRequest(), process.env.ADMIN_API_TOKEN)) {
      throw new UnauthorizedException({ code: "admin_unauthorized" });
    }
    return true;
  }
}

/** Запись событий от внутренних сервисов (`AUDIT_INGEST_TOKEN`). */
@Injectable()
export class IngestTokenGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    if (!bearerMatches(ctx.switchToHttp().getRequest(), process.env.AUDIT_INGEST_TOKEN)) {
      throw new UnauthorizedException({ code: "ingest_unauthorized" });
    }
    return true;
  }
}

const USER_HEADER = "x-routex-user";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Пользователь из `X-RouteX-User` или null. В проде заголовок ставит api-gateway после JWT;
 * пока gateway нет, его шлёт сайт — поэтому такие события сохраняются с trusted = false.
 */
export const OptionalUserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string | null => {
  const value = ctx.switchToHttp().getRequest<Request>().headers[USER_HEADER];
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
});

export const ClientMeta = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<Request>();
  const requestId = req.headers["x-request-id"];
  return {
    ip: req.ip ?? null,
    requestId: typeof requestId === "string" ? requestId : null,
  };
});
