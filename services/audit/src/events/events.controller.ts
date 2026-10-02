import { BadRequestException, Body, Controller, Get, HttpCode, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { log, redact } from "../log";
import { lokiPush } from "../loki";
import { EVENTS } from "./catalog";
import { ClientEventDto, IngestEventDto, ListEventsQuery, TelemetryDto } from "./dto";
import { EventsService } from "./events.service";
import { AdminTokenGuard, ClientMeta, IngestTokenGuard, OptionalUserId } from "./guards";

type Meta = { ip: string | null; requestId: string | null };

@Controller("v1/audit")
export class IngestController {
  constructor(private readonly events: EventsService) {}

  @Post("events")
  @UseGuards(IngestTokenGuard)
  @HttpCode(202)
  async ingest(@Body() dto: IngestEventDto) {
    const { id } = await this.events.record({ ...dto, trusted: true });
    return { id };
  }

  @Post("client-events")
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @HttpCode(202)
  async client(@Body() dto: ClientEventDto, @OptionalUserId() userId: string | null, @ClientMeta() meta: Meta) {
    if (!userId && !EVENTS[dto.type]?.anonymous) throw new BadRequestException({ code: "session_invalid" });
    const source = dto.source ?? "web";
    const { id } = await this.events.record({
      type: dto.type,
      source,
      service: source,
      userId,
      targetId: dto.targetId,
      meta: dto.meta,
      ip: meta.ip,
      requestId: meta.requestId,
      trusted: false,
    });
    return { id };
  }
}

@Controller("v1/telemetry")
export class TelemetryController {
  constructor(private readonly events: EventsService) {}

  @Post("logs")
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @HttpCode(202)
  async logs(@Body() dto: TelemetryDto, @OptionalUserId() userId: string | null, @ClientMeta() meta: Meta) {
    // сам сбой — в технический лог с меткой сервиса-источника (→ Loki)
    log(dto.level, dto.message, {
      origin: dto.source,
      context: dto.context,
      userId,
      requestId: meta.requestId,
      ...dto.meta,
    });
    lokiPush(
      { app: "routex", kind: "log", source: dto.source, service: dto.source, level: dto.level, context: dto.context },
      { msg: dto.message, userId: userId ?? undefined, requestId: meta.requestId ?? undefined, ...(redact(dto.meta ?? {}) as object) },
    );
    if (dto.level === "error") {
      await this.events.record({
        type: "service.error",
        source: dto.source,
        service: dto.source,
        level: "error",
        userId,
        targetId: dto.context,
        meta: { message: dto.message, ...dto.meta },
        ip: meta.ip,
        requestId: meta.requestId,
        trusted: false,
      });
    }
    return { ok: true };
  }
}

@Controller("v1/admin/audit")
@UseGuards(AdminTokenGuard)
export class AdminAuditController {
  constructor(private readonly events: EventsService) {}

  @Get("events")
  list(@Query() q: ListEventsQuery) {
    return this.events.list(q);
  }

  @Get("stats")
  stats() {
    return this.events.stats();
  }
}
