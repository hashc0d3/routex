import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma } from "../generated/client";
import { audit } from "./audit";
import type { ListUsersQuery, LoginDto, RegisterDto } from "./dto";
import { DUMMY_HASH, hashPassword, verifyPassword } from "./password";
import { PrismaService } from "./prisma.service";
import { signAccess, TOKEN_TTL_DAYS } from "./token";

/** 3–24 символа: буквы, цифры, «_ . -» и одиночные пробелы между словами (как на сайте). */
const NICKNAME_RE = /^(?=.{3,24}$)[A-Za-zА-Яа-яЁё0-9_.-]+(?: [A-Za-zА-Яа-яЁё0-9_.-]+)*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONSENT_VERSION = "2026-10";
const MAX_NOTIFICATIONS = 50;
const AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
export const AVATAR_MAX_BYTES = 512 * 1024;

type Client = { ip: string | null; userAgent: string | null };

type UserRow = {
  id: string;
  email: string;
  nickname: string;
  avatarVersion: number;
  avatarMime: string | null;
  createdAt: Date;
};

function cleanNickname(raw: string) {
  const nickname = raw.trim();
  if (!NICKNAME_RE.test(nickname)) throw new BadRequestException({ code: "nickname_invalid" });
  return nickname;
}

function uniqueField(err: unknown): string | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") return null;
  const target = err.meta?.target;
  return Array.isArray(target) ? String(target[0]) : String(target ?? "");
}

const USER_SELECT = {
  id: true,
  email: true,
  nickname: true,
  avatarVersion: true,
  avatarMime: true,
  createdAt: true,
} as const;

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  avatarUrl(u: Pick<UserRow, "id" | "avatarVersion" | "avatarMime">) {
    if (!u.avatarMime) return null;
    const base = (process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4030}`).replace(/\/$/, "");
    return `${base}/v1/avatars/${u.id}?v=${u.avatarVersion}`;
  }

  publicUser(u: UserRow) {
    return {
      id: u.id,
      email: u.email,
      nickname: u.nickname,
      avatarUrl: this.avatarUrl(u),
      createdAt: u.createdAt.toISOString(),
    };
  }

  private async openSession(userId: string, client: Client) {
    const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 86_400_000);
    const s = await this.prisma.session.create({
      data: { userId, expiresAt, ip: client.ip, userAgent: client.userAgent },
      select: { id: true },
    });
    return { accessToken: signAccess({ sub: userId, sid: s.id, exp: Math.floor(expiresAt.getTime() / 1000) }) };
  }

  async nicknameAvailable(raw: string) {
    const nickname = cleanNickname(raw);
    const taken = await this.prisma.user.findUnique({
      where: { nicknameLower: nickname.toLowerCase() },
      select: { id: true },
    });
    return { available: !taken };
  }

  async register(dto: RegisterDto, client: Client) {
    if (!dto.consentOffer || !dto.consentPersonalData) throw new BadRequestException({ code: "consents_required" });
    const nickname = cleanNickname(dto.nickname);
    const email = dto.email.toLowerCase();
    const passwordHash = await hashPassword(dto.password);
    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          nickname,
          nicknameLower: nickname.toLowerCase(),
          lastLoginAt: new Date(),
          consents: {
            create: [
              { type: "OFFER", version: CONSENT_VERSION, accepted: true },
              { type: "PERSONAL_DATA", version: CONSENT_VERSION, accepted: true },
              { type: "MARKETING", version: CONSENT_VERSION, accepted: Boolean(dto.consentMarketing) },
            ],
          },
          notifications: { create: { type: "account_created", data: { nickname } } },
        },
        select: { id: true },
      });
      audit({
        type: "user.registered",
        userId: user.id,
        actor: nickname,
        ip: client.ip,
        meta: { marketing: Boolean(dto.consentMarketing) },
      });
      return this.openSession(user.id, client);
    } catch (err) {
      const field = uniqueField(err);
      if (field?.includes("email")) throw new ConflictException({ code: "email_taken" });
      if (field?.includes("nickname")) throw new ConflictException({ code: "nickname_taken" });
      throw err;
    }
  }

  async login(dto: LoginDto, client: Client) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
      select: { id: true, passwordHash: true, nickname: true },
    });
    const ok = await verifyPassword(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) {
      // email в meta замаскирует сам журнал
      audit({ type: "auth.login_failed", userId: user?.id, ip: client.ip, meta: { email: dto.email, reason: user ? "password" : "unknown_email" } });
      throw new UnauthorizedException({ code: "bad_credentials" });
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const session = await this.openSession(user.id, client);
    audit({ type: "auth.login", userId: user.id, actor: user.nickname, ip: client.ip });
    return session;
  }

  async logout(userId: string, sessionId: string) {
    await this.prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
    audit({ type: "auth.logout", userId, targetId: sessionId });
  }

  async me(userId: string) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: USER_SELECT });
    return { user: this.publicUser(u) };
  }

  async updateNickname(userId: string, raw: string) {
    const nickname = cleanNickname(raw);
    try {
      const before = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { nickname: true } });
      const u = await this.prisma.user.update({
        where: { id: userId },
        data: { nickname, nicknameLower: nickname.toLowerCase() },
        select: USER_SELECT,
      });
      if (before.nickname !== nickname) {
        audit({ type: "user.nickname_changed", userId, actor: nickname, meta: { from: before.nickname, to: nickname } });
      }
      return this.publicUser(u);
    } catch (err) {
      if (uniqueField(err)?.includes("nickname")) throw new ConflictException({ code: "nickname_taken" });
      throw err;
    }
  }

  async setAvatar(userId: string, file: { buffer: Buffer; mimetype: string; size: number } | undefined) {
    if (!file) throw new BadRequestException({ code: "image_failed" });
    if (!AVATAR_TYPES.has(file.mimetype)) throw new BadRequestException({ code: "image_type" });
    if (file.size > AVATAR_MAX_BYTES) throw new BadRequestException({ code: "image_too_big" });
    const u = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: new Uint8Array(file.buffer), avatarMime: file.mimetype, avatarVersion: { increment: 1 } },
      select: USER_SELECT,
    });
    audit({ type: "user.avatar_changed", userId, actor: u.nickname, meta: { action: "upload", bytes: file.size, mime: file.mimetype } });
    return this.publicUser(u);
  }

  async clearAvatar(userId: string) {
    const u = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: null, avatarMime: null, avatarVersion: { increment: 1 } },
      select: USER_SELECT,
    });
    audit({ type: "user.avatar_changed", userId, actor: u.nickname, meta: { action: "remove" } });
    return this.publicUser(u);
  }

  async avatar(userId: string) {
    if (!UUID_RE.test(userId)) throw new NotFoundException();
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatar: true, avatarMime: true } });
    if (!u?.avatar || !u.avatarMime) throw new NotFoundException();
    return { bytes: Buffer.from(u.avatar), mime: u.avatarMime };
  }

  /** Обезличиваем строку и отзываем сессии; ID остаётся, чтобы billing/support подчистили своё. */
  async deleteAccount(userId: string) {
    const { nickname } = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { nickname: true } });
    await this.prisma.$transaction([
      this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.consent.deleteMany({ where: { userId } }),
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@deleted.invalid`,
          nickname: "Удалённый пользователь",
          nicknameLower: `deleted-${userId}`,
          passwordHash: "",
          avatar: null,
          avatarMime: null,
          deletedAt: new Date(),
        },
      }),
    ]);
    audit({ type: "user.deleted", userId, actor: nickname });
  }

  async notifications(userId: string) {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: MAX_NOTIFICATIONS,
    });
    return rows.map((n) => ({
      id: n.id,
      type: n.type,
      data: n.data,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt?.toISOString() ?? null,
    }));
  }

  async markRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }

  async clearNotifications(userId: string) {
    await this.prisma.notification.deleteMany({ where: { userId } });
  }

  // ——— админка ———

  async adminList(q: ListUsersQuery) {
    const take = q.take ?? 25;
    const page = q.page ?? 1;
    const state = q.state ?? "active";
    const where: Prisma.UserWhereInput = {
      ...(state === "active" ? { deletedAt: null } : state === "deleted" ? { deletedAt: { not: null } } : {}),
    };
    const term = q.q?.trim();
    if (term) {
      where.OR = [
        { email: { contains: term, mode: "insensitive" } },
        { nicknameLower: { contains: term.toLowerCase() } },
        ...(UUID_RE.test(term) ? [{ id: term }] : []),
      ];
    }
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * take,
        take,
        select: { ...USER_SELECT, lastLoginAt: true, deletedAt: true },
      }),
    ]);
    return {
      total,
      page,
      take,
      items: rows.map((u) => ({
        ...this.publicUser(u),
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        deletedAt: u.deletedAt?.toISOString() ?? null,
      })),
    };
  }

  async adminGet(id: string) {
    if (!UUID_RE.test(id)) throw new NotFoundException({ code: "user_not_found" });
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...USER_SELECT,
        lastLoginAt: true,
        deletedAt: true,
        updatedAt: true,
        sessions: { orderBy: { createdAt: "desc" }, take: 10 },
        consents: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!u) throw new NotFoundException({ code: "user_not_found" });
    const now = new Date();
    return {
      ...this.publicUser(u),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      deletedAt: u.deletedAt?.toISOString() ?? null,
      updatedAt: u.updatedAt.toISOString(),
      sessions: u.sessions.map((s) => ({
        id: s.id,
        ip: s.ip,
        userAgent: s.userAgent,
        createdAt: s.createdAt.toISOString(),
        lastSeenAt: s.lastSeenAt.toISOString(),
        active: !s.revokedAt && s.expiresAt > now,
      })),
      consents: u.consents.map((c) => ({
        type: c.type,
        version: c.version,
        accepted: c.accepted,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  async adminRevokeSessions(id: string) {
    if (!UUID_RE.test(id)) throw new NotFoundException({ code: "user_not_found" });
    const r = await this.prisma.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    return { revoked: r.count };
  }

  async adminStats() {
    const day = new Date(Date.now() - 86_400_000);
    const week = new Date(Date.now() - 7 * 86_400_000);
    const [total, new24h, new7d, online24h] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, createdAt: { gte: day } } }),
      this.prisma.user.count({ where: { deletedAt: null, createdAt: { gte: week } } }),
      this.prisma.user.count({
        where: { deletedAt: null, sessions: { some: { revokedAt: null, lastSeenAt: { gte: day } } } },
      }),
    ]);
    return { total, new24h, new7d, online24h };
  }
}
