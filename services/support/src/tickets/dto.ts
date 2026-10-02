import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export const TICKET_STATUSES = ["open", "in_progress", "waiting", "resolved", "closed"] as const;
export type TicketStatusValue = (typeof TICKET_STATUSES)[number];

class TicketUserDto {
  @IsString()
  @Length(1, 64)
  id: string;

  @IsString()
  @Length(1, 32)
  nickname: string;

  @IsEmail()
  email: string;
}

class TicketContactDto {
  @IsIn(["phone", "nickname"])
  type: "phone" | "nickname";

  @IsString()
  @Length(1, 32)
  value: string;
}

export class CreateTicketDto {
  @IsString()
  @Length(1, 4000)
  description: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TicketUserDto)
  user?: TicketUserDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TicketContactDto)
  contact?: TicketContactDto;

  @IsOptional()
  @IsBoolean()
  pdConsent?: boolean;

  @IsOptional()
  @IsBoolean()
  attachOk?: boolean;

  @IsOptional()
  @IsIn(["web", "app"])
  source?: "web" | "app";

  @IsOptional()
  @IsIn(["ru", "en"])
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  page?: string;
}

export class ListTicketsQuery {
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: TicketStatusValue;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}

export class UpdateTicketDto {
  @IsIn(TICKET_STATUSES)
  status: TicketStatusValue;
}

export class UserMessageDto {
  @IsString()
  @Length(1, 4000)
  body: string;
}

export class AddMessageDto {
  @IsString()
  @Length(1, 4000)
  body: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  authorName?: string;
}
