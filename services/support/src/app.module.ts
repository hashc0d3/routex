import { Controller, Get, Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule, PrismaService } from "./prisma.service";
import { TicketsModule } from "./tickets/tickets.module";

@Controller("health")
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { ok: true, service: "support" };
  }
}

@Module({
  imports: [PrismaModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]), TicketsModule],
  controllers: [HealthController],
})
export class AppModule {}
