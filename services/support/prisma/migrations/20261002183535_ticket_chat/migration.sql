-- AlterEnum
ALTER TYPE "TicketAuthor" ADD VALUE 'system';

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "last_staff_at" TIMESTAMP(3),
ADD COLUMN     "last_user_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "staff_seen_at" TIMESTAMP(3),
ADD COLUMN     "user_seen_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_notifications_user_id_created_at_idx" ON "user_notifications"("user_id", "created_at" DESC);
