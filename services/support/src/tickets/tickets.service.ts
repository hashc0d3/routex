import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Ticket } from "@prisma/client";
import { audit } from "../audit";
import { PrismaService } from "../prisma.service";
import type { AddMessageDto, CreateTicketDto, ListTicketsQuery, TicketStatusValue } from "./dto";

const NICKNAME_RE = /^(?=.{3,24}$)[A-Za-zА-Яа-яЁё0-9_.-]+(?: [A-Za-zА-Яа-яЁё0-9_.-]+)*$/;
const MIN_DESCRIPTION = 10;

function fail(code: string): never {
  throw new BadRequestException({ code });
}

/** Принимает «8 (999) 123-45-67», «+7 999…», «+380…»; хранит в виде +цифры. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!/^[\d\s()+-]+$/.test(raw.trim())) return null;
  if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (digits.length === 10 && !raw.trim().startsWith("+")) return `+7${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return `+${digits}`;
}

function subjectFrom(description: string) {
  const firstLine = description.split(/\r?\n/).find((l) => l.trim()) ?? description;
  const s = firstLine.trim().replace(/\s+/g, " ");
  return s.length > 80 ? `${s.slice(0, 79)}…` : s;
}

const newer = (a: Date | null, b: Date | null) => Boolean(a && (!b || a > b));

/** Поля, которые видит сам пользователь: без контактов и служебных отметок поддержки. */
function forUser(t: Ticket) {
  return {
    id: t.id,
    number: t.number,
    subject: t.subject,
    status: t.status,
    source: t.source,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    unread: newer(t.lastStaffAt, t.userSeenAt),
  };
}

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTicketDto) {
    const description = dto.description.trim();
    if (description.length < MIN_DESCRIPTION) fail("ticket_description_short");

    const data: Prisma.TicketCreateInput = {
      subject: subjectFrom(description),
      source: dto.source ?? "web",
      locale: dto.locale ?? "ru",
      page: dto.page ?? null,
      attachOk: dto.attachOk ?? false,
      messages: { create: { author: "user", body: description } },
    };

    if (dto.user) {
      data.userId = dto.user.id;
      data.userNickname = dto.user.nickname;
      data.userEmail = dto.user.email.toLowerCase();
      data.userSeenAt = new Date();
      data.messages = { create: { author: "user", authorName: dto.user.nickname, body: description } };
    } else {
      if (!dto.contact?.value.trim()) fail("ticket_contact_required");
      if (!dto.pdConsent) fail("consents_required");
      if (dto.contact.type === "phone") {
        const phone = normalizePhone(dto.contact.value);
        if (!phone) fail("ticket_phone_invalid");
        data.contactPhone = phone;
      } else {
        const nick = dto.contact.value.trim();
        if (!NICKNAME_RE.test(nick)) fail("nickname_invalid");
        data.contactNickname = nick;
        data.messages = { create: { author: "user", authorName: nick, body: description } };
      }
      data.pdConsentAt = new Date();
    }

    const created = await this.prisma.ticket.create({ data, select: { id: true, number: true } });
    audit({
      type: "ticket.created",
      userId: dto.user?.id,
      actor: dto.user?.nickname ?? data.contactNickname ?? (data.contactPhone ? "гость (телефон)" : null),
      targetId: created.id,
      meta: { chatId: created.id, number: created.number, source: data.source, guest: !dto.user, page: data.page ?? null },
    });
    return created;
  }

  // ---------- пользователь ----------

  async listForUser(userId: string) {
    const items = await this.prisma.ticket.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    return items.map(forUser);
  }

  private async ownTicket(userId: string, id: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    // чужую заявку не отличаем от несуществующей
    if (!ticket || ticket.userId !== userId) throw new NotFoundException({ code: "ticket_not_found" });
    return ticket;
  }

  async getForUser(userId: string, id: string) {
    const own = await this.ownTicket(userId, id);
    const ticket = await this.prisma.ticket.update({
      where: { id },
      // просмотр не должен поднимать заявку в списке
      data: { userSeenAt: new Date(), updatedAt: own.updatedAt },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    return {
      ...forUser(ticket),
      unread: false,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        author: m.author,
        // имя сотрудника пользователю не показываем — только «Поддержка RouteX»
        authorName: m.author === "user" ? m.authorName : null,
        body: m.body,
        createdAt: m.createdAt,
      })),
    };
  }

  async replyAsUser(userId: string, id: string, body: string) {
    const ticket = await this.ownTicket(userId, id);
    const text = body.trim();
    if (!text) fail("validation");
    const now = new Date();
    // ответ пользователя возвращает заявку в работу; решённую или закрытую — открывает заново
    const next: TicketStatusValue | null =
      ticket.status === "closed" || ticket.status === "resolved"
        ? "open"
        : ticket.status === "waiting"
          ? "in_progress"
          : null;

    await this.prisma.$transaction([
      this.prisma.ticketMessage.create({
        data: { ticketId: id, author: "user", authorName: ticket.userNickname, body: text },
      }),
      ...(next ? [this.prisma.ticketMessage.create({ data: { ticketId: id, author: "system", body: next } })] : []),
      this.prisma.ticket.update({
        where: { id },
        data: { lastUserAt: now, userSeenAt: now, ...(next ? { status: next } : {}) },
      }),
    ]);
    audit({
      type: "ticket.message",
      userId,
      actor: ticket.userNickname,
      targetId: id,
      meta: { chatId: id, number: ticket.number, author: "user", length: text.length },
    });
    if (next) audit({ type: "ticket.status_changed", userId, targetId: id, meta: { chatId: id, number: ticket.number, from: ticket.status, to: next, by: "user" } });
    return this.getForUser(userId, id);
  }

  // ---------- поддержка ----------

  async list(query: ListTicketsQuery) {
    const take = query.take ?? 20;
    const page = query.page ?? 1;
    const q = query.q?.trim();

    const where: Prisma.TicketWhereInput = {};
    if (query.status) where.status = query.status;
    if (q) {
      const mode = Prisma.QueryMode.insensitive;
      const or: Prisma.TicketWhereInput[] = [
        { subject: { contains: q, mode } },
        { userNickname: { contains: q, mode } },
        { userEmail: { contains: q, mode } },
        { contactNickname: { contains: q, mode } },
        { contactPhone: { contains: q.replace(/\D/g, "") || q } },
      ];
      const num = Number(q.replace(/^#/, ""));
      if (Number.isInteger(num) && num > 0 && num < 2 ** 31) or.push({ number: num });
      where.OR = or;
    }

    const [items, total, grouped] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * take,
        take,
        include: { _count: { select: { messages: true } } },
      }),
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { status: "asc" } }),
    ]);

    const counts = { open: 0, in_progress: 0, waiting: 0, resolved: 0, closed: 0 } as Record<TicketStatusValue, number>;
    for (const g of grouped) {
      const c = g._count;
      counts[g.status] = typeof c === "object" && c ? (c._all ?? 0) : 0;
    }

    return {
      items: items.map((t) => ({ ...t, unread: newer(t.lastUserAt, t.staffSeenAt) })),
      total,
      page,
      take,
      counts,
    };
  }

  private async exists(id: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException({ code: "ticket_not_found" });
    return ticket;
  }

  async get(id: string) {
    const current = await this.exists(id);
    return this.prisma.ticket.update({
      where: { id },
      data: { staffSeenAt: new Date(), updatedAt: current.updatedAt },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  /** Уведомление в колокольчик — только владельцу аккаунта; гостю отвечают по телефону/нику. */
  private notifyUser(ticket: Ticket, type: "ticket_reply" | "ticket_status", extra: Record<string, string> = {}) {
    if (!ticket.userId) return [];
    return [
      this.prisma.userNotification.create({
        data: { userId: ticket.userId, type, data: { ticketId: ticket.id, number: ticket.number, ...extra } },
      }),
    ];
  }

  async setStatus(id: string, status: TicketStatusValue) {
    const ticket = await this.exists(id);
    if (ticket.status === status) return ticket;
    const [, updated] = await this.prisma.$transaction([
      this.prisma.ticketMessage.create({ data: { ticketId: id, author: "system", body: status } }),
      this.prisma.ticket.update({ where: { id }, data: { status } }),
      ...this.notifyUser(ticket, "ticket_status", { status }),
    ]);
    audit({
      type: "ticket.status_changed",
      userId: ticket.userId,
      targetId: id,
      meta: { chatId: id, number: ticket.number, from: ticket.status, to: status, by: "staff" },
    });
    return updated;
  }

  // ---------- уведомления пользователя ----------

  listNotifications(userId: string) {
    return this.prisma.userNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async markNotificationsRead(userId: string) {
    await this.prisma.userNotification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }

  async clearNotifications(userId: string) {
    await this.prisma.userNotification.deleteMany({ where: { userId } });
  }

  async addStaffMessage(id: string, dto: AddMessageDto) {
    const ticket = await this.exists(id);
    const now = new Date();
    // ответили пользователю — ждём его реакции
    const next: TicketStatusValue | null = ticket.status === "open" || ticket.status === "in_progress" ? "waiting" : null;
    const [message] = await this.prisma.$transaction([
      this.prisma.ticketMessage.create({
        data: { ticketId: id, author: "staff", authorName: dto.authorName ?? null, body: dto.body.trim() },
      }),
      ...(next ? [this.prisma.ticketMessage.create({ data: { ticketId: id, author: "system", body: next } })] : []),
      this.prisma.ticket.update({
        where: { id },
        data: { lastStaffAt: now, staffSeenAt: now, ...(next ? { status: next } : {}) },
      }),
      ...this.notifyUser(ticket, "ticket_reply"),
    ]);
    audit({
      type: "ticket.message",
      userId: ticket.userId,
      actor: dto.authorName ?? "поддержка",
      targetId: id,
      meta: { chatId: id, number: ticket.number, author: "staff", length: message.body.length },
    });
    if (next) audit({ type: "ticket.status_changed", userId: ticket.userId, targetId: id, meta: { chatId: id, number: ticket.number, from: ticket.status, to: next, by: "staff" } });
    return message;
  }
}
