import { Controller, Get, Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { AdminUsersController, AuthController, AvatarsController, MeController } from "./accounts.controller";
import { AccountsService } from "./accounts.service";
import { AdminTokenGuard, UserGuard } from "./guards";
import { PrismaModule, PrismaService } from "./prisma.service";

@Controller("health")
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { ok: true, service: "identity" };
  }
}

@Module({
  imports: [PrismaModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
  controllers: [HealthController, AuthController, MeController, AvatarsController, AdminUsersController],
  providers: [AccountsService, UserGuard, AdminTokenGuard],
})
export class AppModule {}
