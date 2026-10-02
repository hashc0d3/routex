import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";

/** Пускает только сервер админки: `Authorization: Bearer <ADMIN_API_TOKEN>`. */
@Injectable()
export class AdminTokenGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const expected = process.env.ADMIN_API_TOKEN;
    const header = ctx.switchToHttp().getRequest<Request>().headers.authorization ?? "";
    const got = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!expected || !got) throw new UnauthorizedException({ code: "admin_unauthorized" });
    const a = Buffer.from(got);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException({ code: "admin_unauthorized" });
    return true;
  }
}
