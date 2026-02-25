-- AlterTable
ALTER TABLE "act_requirements" ADD COLUMN     "ship_id" UUID,
ADD COLUMN     "user_check_observaciones" TEXT,
ADD COLUMN     "user_check_requerido" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "user_check_requerido_aprobado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "user_checked_at" TIMESTAMPTZ(6),
ADD COLUMN     "user_checked_by" UUID;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_user_checked_by_fkey" FOREIGN KEY ("user_checked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_ship_id_fkey" FOREIGN KEY ("ship_id") REFERENCES "mnt_installations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
