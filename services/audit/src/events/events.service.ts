import { BadRequestException, Injectable } from "@nestjs/common";
import type { AuditLevel, AuditSource, Prisma } from "../../generated/client";
import { log, redact } from "../log";
import { lokiPush } from "../loki";
import { PrismaService } from "../prisma.service";
import { EVENTS } from "./catalog";
import type { ListEventsQuery } from "./dto";

const MAX_META_BYTES = 2048;

export type NewEvent = {
  type: string;
  source: AuditSource;
  service: string;
  level?: AuditLevel;
  userId?: string | null;
  actor?: string | null;
  targetId?: string | null;
  requestId?: string | null;
  ip?: string | null;
  trusted?: boolean;
  meta?: Record<string, unknown>;
};

function cleanMeta(meta: Record<string, unknown> | undefined) {
  const safe = (redact(meta ?? {}) ?? {}) as Prisma.InputJsonObject;
  if (Buffer.byteLength(JSON.stringify(safe)) > MAX_META_BYTES) throw new BadRequestException({ code: "meta_too_large" });
  return safe;
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async record(e: NewEvent) {
    const level = e.level ?? EVENTS[e.type]?.level ?? "info";
    const meta = cleanMeta(e.meta);
    const row = await this.prisma.auditEvent.create({
      data: {
        type: e.type,
        source: e.source,
        service: e.service,
        level,
        userId: e.userId ?? null,
        actor: e.actor ?? null,
        targetId: e.targetId ?? null,
        requestId: e.requestId ?? null,
        ip: e.ip ?? null,
        trusted: e.trusted ?? true,
        meta,
      },
      select: { id: true, createdAt: true },
    });
    // дублируем в лог: в Loki события видны рядом с техническими логами того же requestId
    log(level, "audit", {
      event: e.type,
      eventService: e.service,
      source: e.source,
      userId: e.userId,
      targetId: e.targetId,
      requestId: e.requestId,
      eventId: row.id,
    });
    lokiPush(
      { app: "routex", kind: "event", source: e.source, service: e.service, level, type: e.type },
      {
        msg: e.type,
        userId: e.userId ?? undefined,
        actor: e.actor ?? undefined,
        targetId: e.targetId ?? undefined,
        requestId: e.requestId ?? undefined,
        trusted: e.trusted ?? true,
        eventId: row.id,
        ...meta,
      },
      row.createdAt,
    );
    return row;
  }

  async list(q: ListEventsQuery) {
    const take = q.take ?? 50;
    const where: Prisma.AuditEventWhereInput = {};
    if (q.type) where.type = q.type.endsWith(".") ? { startsWith: q.type } : q.type;
    if (q.source) where.source = q.source;
    if (q.level) where.level = q.level;
    if (q.userId) where.userId = q.userId;
    if (q.targetId) where.targetId = q.targetId;
    if (q.since || q.before) {
      where.createdAt = {
        ...(q.since ? { gte: new Date(q.since) } : {}),
        ...(q.before ? { lt: new Date(q.before) } : {}),
      };
    }
    const term = q.q?.trim();
    if (term) {
      const mode = "insensitive" as const;
      where.OR = [
        { actor: { contains: term, mode } },
        { targetId: { contains: term, mode } },
        { requestId: { contains: term, mode } },
        { type: { contains: term, mode } },
      ];
    }

    const items = await this.prisma.auditEvent.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
    });
    const hasMore = items.length > take;
    const page = hasMore ? items.slice(0, take) : items;
    return { items: page, nextBefore: hasMore ? page[page.length - 1].createdAt.toISOString() : null };
  }

  async stats() {
    const since = new Date(Date.now() - 24 * 3600_000);
    const [byLevel, byType] = await this.prisma.$transaction([
      this.prisma.auditEvent.groupBy({
        by: ["level"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { level: "asc" },
      }),
      this.prisma.auditEvent.groupBy({
        by: ["type"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { type: "desc" } },
        take: 8,
      }),
    ]);
    const count = (c: unknown) => (typeof c === "object" && c ? ((c as { _all?: number })._all ?? 0) : 0);
    const levels = { info: 0, warn: 0, error: 0 } as Record<AuditLevel, number>;
    for (const g of byLevel) levels[g.level] = count(g._count);
    return {
      since: since.toISOString(),
      total: levels.info + levels.warn + levels.error,
      levels,
      byType: byType.map((g) => ({ type: g.type, count: count(g._count) })),
    };
  }
}
