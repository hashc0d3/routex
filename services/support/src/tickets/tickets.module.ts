import { Module } from "@nestjs/common";
import { AdminTicketsController, PublicTicketsController, UserTicketsController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";

@Module({
  controllers: [PublicTicketsController, UserTicketsController, AdminTicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
