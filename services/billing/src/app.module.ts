import { Controller, Get, Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { AdminBillingController, BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { AdminTokenGuard, UserGuard } from "./guards";
import { PrismaModule, PrismaService } from "./prisma.service";

@Controller("health")
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { ok: true, service: "billing" };
  }
}

@Module({
  imports: [PrismaModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
  controllers: [HealthController, BillingController, AdminBillingController],
  providers: [BillingService, UserGuard, AdminTokenGuard],
})
export class AppModule {}
