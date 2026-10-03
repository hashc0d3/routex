import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { BillingService } from "./billing.service";
import { LookupDto, MockPayDto, ReferralClaimDto } from "./dto";
import { AdminTokenGuard, UserGuard, UserId } from "./guards";

@Controller("v1/billing")
@UseGuards(ThrottlerGuard, UserGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("me")
  me(@UserId() userId: string) {
    return this.billing.me(userId);
  }

  /** Пока нет ключей ЮKassa: оплата без денег. С PROVIDER=yookassa здесь будет 403. */
  @Post("mock/pay")
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  pay(@UserId() userId: string, @Body() dto: MockPayDto) {
    if ((process.env.PROVIDER ?? "mock") !== "mock") throw new ForbiddenException({ code: "mock_disabled" });
    return this.billing.mockPay(userId, dto);
  }

  /** Регистрация прошла по реферальной ссылке: запоминаем, кто пригласил. Бонус придёт после первой оплаты. */
  @Post("me/referral")
  @HttpCode(204)
  referral(@UserId() userId: string, @Body() dto: ReferralClaimDto) {
    if (dto.code) return this.billing.attributeReferral(userId, dto.code);
  }

  /** 300 бонусов → 10 дней подписки, добавленных к текущему сроку. */
  @Post("me/bonus/claim")
  @HttpCode(200)
  claim(@UserId() userId: string) {
    return this.billing.claimBonus(userId);
  }

  @Get("me/notifications")
  notifications(@UserId() userId: string) {
    return this.billing.notifications(userId);
  }

  @Post("me/notifications/read")
  @HttpCode(204)
  read(@UserId() userId: string) {
    return this.billing.markRead(userId);
  }

  @Delete("me/notifications")
  @HttpCode(204)
  clear(@UserId() userId: string) {
    return this.billing.clearNotifications(userId);
  }

  @Delete("me")
  @HttpCode(204)
  forget(@UserId() userId: string) {
    return this.billing.forget(userId);
  }
}

@Controller("v1/admin/billing")
@UseGuards(AdminTokenGuard)
export class AdminBillingController {
  constructor(private readonly billing: BillingService) {}

  @Post("lookup")
  @HttpCode(200)
  lookup(@Body() dto: LookupDto) {
    return this.billing.lookup(dto.userIds);
  }

  @Get("stats")
  stats() {
    return this.billing.stats();
  }

  @Get("users/:id")
  user(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.billing.adminUser(id);
  }
}
