/*
  Warnings:

  - You are about to drop the column `recipients` on the `module_notification_settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "module_notification_settings" DROP COLUMN "recipients",
ADD COLUMN     "required_permissions" TEXT[];

-- CreateTable
CREATE TABLE "user_notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "module_code" VARCHAR(50) NOT NULL,
    "event_key" VARCHAR(100) NOT NULL,
    "is_opted_out" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_notification_preferences_user_id_idx" ON "user_notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_preferences_user_id_module_code_event_key_key" ON "user_notification_preferences"("user_id", "module_code", "event_key");

-- AddForeignKey
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
