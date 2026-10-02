import { Type } from "class-transformer";
import { IsIn, IsInt, IsISO8601, IsObject, IsOptional, IsString, IsUUID, Length, Max, MaxLength, Min } from "class-validator";
import { CLIENT_EVENT_TYPES, EVENT_TYPES } from "./catalog";

export const SOURCES = ["web", "pc", "admin", "service"] as const;
export const LEVELS = ["info", "warn", "error"] as const;

/** Внутренние сервисы (support, admin, позже billing/identity) — по AUDIT_INGEST_TOKEN. */
export class IngestEventDto {
  @IsIn(EVENT_TYPES)
  type: string;

  @IsIn(SOURCES)
  source: (typeof SOURCES)[number];

  @IsString()
  @Length(1, 32)
  service: string;

  @IsOptional()
  @IsIn(LEVELS)
  level?: (typeof LEVELS)[number];

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  actor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  requestId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ip?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}

/** С сайта или клиента Windows: пользователь — из X-RouteX-User, источник помечается как недоверенный. */
export class ClientEventDto {
  @IsIn(CLIENT_EVENT_TYPES)
  type: string;

  @IsOptional()
  @IsIn(["web", "pc"])
  source?: "web" | "pc";

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetId?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}

/** Технические сбои с сайта/клиента: пишутся в лог (→ Loki) и событием service.error в журнал. */
export class TelemetryDto {
  @IsIn(["web", "pc"])
  source: "web" | "pc";

  @IsIn(["warn", "error"])
  level: "warn" | "error";

  /** Где случилось: account, tickets, login, api:/v1/me… */
  @IsString()
  @Length(1, 64)
  context: string;

  @IsString()
  @Length(1, 300)
  message: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}

export class ListEventsQuery {
  /** Точный тип (subscription.purchased) или группа с точкой на конце (ticket.) */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  type?: string;

  @IsOptional()
  @IsIn(SOURCES)
  source?: (typeof SOURCES)[number];

  @IsOptional()
  @IsIn(LEVELS)
  level?: (typeof LEVELS)[number];

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetId?: string;

  /** Поиск по actor / targetId / requestId */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsISO8601()
  since?: string;

  /** Курсор: createdAt последней показанной строки */
  @IsOptional()
  @IsISO8601()
  before?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}
