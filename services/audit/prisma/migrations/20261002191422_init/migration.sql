-- CreateEnum
CREATE TYPE "AuditSource" AS ENUM ('web', 'pc', 'admin', 'service');

-- CreateEnum
CREATE TYPE "AuditLevel" AS ENUM ('info', 'warn', 'error');

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "source" "AuditSource" NOT NULL,
    "service" VARCHAR(32) NOT NULL,
    "level" "AuditLevel" NOT NULL DEFAULT 'info',
    "user_id" UUID,
    "actor" VARCHAR(128),
    "target_id" VARCHAR(64),
    "request_id" VARCHAR(64),
    "ip" VARCHAR(64),
    "trusted" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at");

-- CreateIndex
CREATE INDEX "audit_events_user_id_created_at_idx" ON "audit_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_type_created_at_idx" ON "audit_events"("type", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_target_id_idx" ON "audit_events"("target_id");
