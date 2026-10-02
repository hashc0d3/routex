import { Controller, Get, Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { AdminAuditController, IngestController, TelemetryController } from "./events/events.controller";
import { EventsService } from "./events/events.service";
import { PrismaModule, PrismaService } from "./prisma.service";

@Controller("health")
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { ok: true, service: "audit" };
  }
}

@Module({
  imports: [PrismaModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
  controllers: [HealthController, IngestController, TelemetryController, AdminAuditController],
  providers: [EventsService],
})
export class AppModule {}
