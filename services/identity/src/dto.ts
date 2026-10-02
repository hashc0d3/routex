import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class RegisterDto {
  @Transform(trim)
  @IsEmail({}, { message: "email" })
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @MaxLength(64)
  nickname: string;

  @IsBoolean()
  consentOffer: boolean;

  @IsBoolean()
  consentPersonalData: boolean;

  @IsOptional()
  @IsBoolean()
  consentMarketing?: boolean;
}

export class LoginDto {
  @Transform(trim)
  @IsString()
  @MaxLength(254)
  email: string;

  @IsString()
  @MaxLength(128)
  password: string;
}

export class ProfileDto {
  @IsString()
  @MaxLength(64)
  nickname: string;
}

export class NicknameQuery {
  @IsString()
  @MaxLength(64)
  nickname: string;
}

export class ListUsersQuery {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
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

  /** active — без удалённых (по умолчанию), deleted — только удалённые, all — все */
  @IsOptional()
  @IsString()
  state?: "active" | "deleted" | "all";
}
