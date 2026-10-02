import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { PrismaService } from "./prisma.service";
import { verifyAccess } from "./token";

type Authed = Request & { auth?: { userId: string; sessionId: string } };

const bearer = (req: Request) => {
  const h = req.headers.authorization ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
};

/** Клиент сайта/PC: подпись токена + живая сессия + неудалённый пользователь. */
@Injectable()
export class UserGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Authed>();
    const claims = verifyAccess(bearer(req));
    if (!claims) throw new UnauthorizedException({ code: "session_invalid" });
    const session = await this.prisma.session.findUnique({
      where: { id: claims.sid },
      select: { userId: true, revokedAt: true, expiresAt: true, lastSeenAt: true, user: { select: { deletedAt: true } } },
    });
    if (
      !session ||
      session.userId !== claims.sub ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.user.deletedAt
    ) {
      throw new UnauthorizedException({ code: "session_invalid" });
    }
    // не пишем в БД на каждый запрос: «последняя активность» с точностью до 5 минут
    if (Date.now() - session.lastSeenAt.getTime() > 5 * 60_000) {
      await this.prisma.session.update({ where: { id: claims.sid }, data: { lastSeenAt: new Date() } });
    }
    req.auth = { userId: claims.sub, sessionId: claims.sid };
    return true;
  }
}

export const Auth = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest<Authed>().auth!;
});

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

export const ClientInfo = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return { ip: req.ip ?? null, userAgent: (req.headers["user-agent"] ?? "").slice(0, 256) || null };
});
