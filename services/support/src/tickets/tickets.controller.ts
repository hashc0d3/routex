import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AdminTokenGuard } from "./admin.guard";
import { AddMessageDto, CreateTicketDto, ListTicketsQuery, UpdateTicketDto, UserMessageDto } from "./dto";
import { CurrentUserId, UserHeaderGuard } from "./user.guard";
import { TicketsService } from "./tickets.service";

/**
 * Публичный вход. Пока api-gateway нет, сайт шлёт снимок `user` сам;
 * за gateway поле будет заполняться из JWT, а присланное — игнорироваться.
 */
@Controller("v1/support/tickets")
@UseGuards(ThrottlerGuard)
export class PublicTicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post()
  @Throttle({ default: { ttl: 10 * 60_000, limit: 5 } })
  create(@Body() dto: CreateTicketDto) {
    return this.tickets.create(dto);
  }
}

@Controller("v1/support/me")
@UseGuards(UserHeaderGuard, ThrottlerGuard)
export class UserTicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get("tickets")
  list(@CurrentUserId() userId: string) {
    return this.tickets.listForUser(userId);
  }

  @Get("tickets/:id")
  get(@CurrentUserId() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.tickets.getForUser(userId, id);
  }

  @Post("tickets/:id/messages")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  reply(@CurrentUserId() userId: string, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UserMessageDto) {
    return this.tickets.replyAsUser(userId, id, dto.body);
  }

  @Get("notifications")
  notifications(@CurrentUserId() userId: string) {
    return this.tickets.listNotifications(userId);
  }

  @Post("notifications/read")
  async markRead(@CurrentUserId() userId: string) {
    await this.tickets.markNotificationsRead(userId);
    return { ok: true };
  }

  @Delete("notifications")
  async clear(@CurrentUserId() userId: string) {
    await this.tickets.clearNotifications(userId);
    return { ok: true };
  }
}

@Controller("v1/admin/tickets")
@UseGuards(AdminTokenGuard)
export class AdminTicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  list(@Query() query: ListTicketsQuery) {
    return this.tickets.list(query);
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.tickets.get(id);
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateTicketDto) {
    return this.tickets.setStatus(id, dto.status);
  }

  @Post(":id/messages")
  addMessage(@Param("id", ParseUUIDPipe) id: string, @Body() dto: AddMessageDto) {
    return this.tickets.addStaffMessage(id, dto);
  }
}
