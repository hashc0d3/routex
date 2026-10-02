import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class MockPayDto {
  @IsIn(["pro_month", "pro_year"])
  planCode: "pro_month" | "pro_year";

  /** Один ключ на одно нажатие «Оплатить»: повтор запроса не создаст второй платёж. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  idempotencyKey?: string;
}

export class LookupDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID("all", { each: true })
  userIds: string[];
}
