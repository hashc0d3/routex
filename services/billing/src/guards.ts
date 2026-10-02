import { CanActivate, createParamDecorator, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { verifyAccess } from "./token";

type Authed = Request & { userId?: string };

const bearer = (req: Request) => {
  const h = req.headers.authorization ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
};

@Injectable()
export class UserGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Authed>();
    const claims = verifyAccess(bearer(req));
    if (!claims) throw new UnauthorizedException({ code: "session_invalid" });
    req.userId = claims.sub;
    return true;
  }
}

export const UserId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<Authed>().userId!,
);

/** Пускает только сервер админки: `Authorization: Bearer <ADMIN_API_TOKEN>`. */
@Injectable()
export class AdminTokenGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const expected = process.env.ADMIN_API_TOKEN;
    const got = bearer(ctx.switchToHttp().getRequest<Request>());
    if (!expected || !got) throw new UnauthorizedException({ code: "admin_unauthorized" });
    const a = Buffer.from(got);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException({ code: "admin_unauthorized" });
    return true;
  }
}
