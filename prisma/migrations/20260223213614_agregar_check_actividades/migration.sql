/*
  Warnings:

  - You are about to drop the column `updated_at` on the `act_activities` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "act_activities" DROP COLUMN "updated_at",
ADD COLUMN     "checked_at" TIMESTAMPTZ(6),
ADD COLUMN     "checked_by" UUID,
ADD COLUMN     "is_checked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userId" UUID;

-- AddForeignKey
ALTER TABLE "act_activities" ADD CONSTRAINT "act_activities_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activities" ADD CONSTRAINT "act_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
