-- AlterTable
ALTER TABLE "act_activities" ADD COLUMN     "estimated_value" DECIMAL(15,2) DEFAULT 0,
ADD COLUMN     "location_id" UUID,
ADD COLUMN     "observations" TEXT,
ADD COLUMN     "status_id" UUID;

-- AlterTable
ALTER TABLE "act_requirements" ADD COLUMN     "area_id" UUID,
ADD COLUMN     "estimated_time" VARCHAR(10),
ADD COLUMN     "estimated_value" DECIMAL(15,2) DEFAULT 0,
ADD COLUMN     "master_activity_name_id" UUID,
ADD COLUMN     "master_activity_name_text" TEXT,
ADD COLUMN     "nombre_solicitante" VARCHAR(150),
ALTER COLUMN "title" DROP NOT NULL;

-- CreateTable
CREATE TABLE "act_master_activity_names" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "default_location_id" UUID,
    "default_area_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "act_master_activity_names_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_status_acts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "color_hex" VARCHAR(7),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "act_status_acts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "act_master_activity_names_name_key" ON "act_master_activity_names"("name");

-- CreateIndex
CREATE UNIQUE INDEX "act_status_acts_name_key" ON "act_status_acts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "act_status_acts_code_key" ON "act_status_acts"("code");

-- CreateIndex
CREATE INDEX "act_activities_location_id_idx" ON "act_activities"("location_id");

-- CreateIndex
CREATE INDEX "act_activities_status_id_idx" ON "act_activities"("status_id");

-- CreateIndex
CREATE INDEX "act_requirements_area_id_idx" ON "act_requirements"("area_id");

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "mnt_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_master_activity_name_id_fkey" FOREIGN KEY ("master_activity_name_id") REFERENCES "act_master_activity_names"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activities" ADD CONSTRAINT "act_activities_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "mnt_activity_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activities" ADD CONSTRAINT "act_activities_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "act_status_acts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
