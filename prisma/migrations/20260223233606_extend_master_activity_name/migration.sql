-- AlterTable
ALTER TABLE "act_master_activity_names" ADD COLUMN     "default_applicant_user_id" UUID,
ADD COLUMN     "default_description" TEXT;

-- AddForeignKey
ALTER TABLE "act_master_activity_names" ADD CONSTRAINT "act_master_activity_names_default_area_id_fkey" FOREIGN KEY ("default_area_id") REFERENCES "mnt_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_master_activity_names" ADD CONSTRAINT "act_master_activity_names_default_applicant_user_id_fkey" FOREIGN KEY ("default_applicant_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
