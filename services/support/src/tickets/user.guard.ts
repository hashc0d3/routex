import { CanActivate, createParamDecorator, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

const HEADER = "x-routex-user";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Пользователь из заголовка `X-RouteX-User`. В проде его ставит api-gateway после проверки JWT
 * (а присланный клиентом — вырезает); пока gateway нет, заголовок шлёт сайт.
 */
@Injectable()
export class UserHeaderGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const value = ctx.switchToHttp().getRequest<Request>().headers[HEADER];
    if (typeof value !== "string" || !UUID_RE.test(value)) throw new UnauthorizedException({ code: "session_invalid" });
    return true;
  }
}

export const CurrentUserId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<Request>().headers[HEADER] as string,
);
