-- CreateTable
CREATE TABLE "act_activity_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "act_activity_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_priorities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "color_hex" VARCHAR(7) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "act_priorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_status_reqs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "color_hex" VARCHAR(7),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "act_status_reqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_requirements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "folio" SERIAL NOT NULL,
    "folio_prefix" VARCHAR(10) NOT NULL DEFAULT 'REQ',
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "observations" TEXT,
    "activity_type_id" UUID NOT NULL,
    "priority_id" UUID NOT NULL,
    "status_id" UUID NOT NULL,
    "location_id" UUID,
    "applicant_user_id" UUID,
    "responsible_user_id" UUID,
    "estimated_date" DATE,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMPTZ(6),
    "approved_by" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "act_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requirement_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "activity_type_id" UUID,
    "description" TEXT,
    "location" VARCHAR(200),
    "start_date" DATE,
    "end_date" DATE,
    "status_activity" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "registered_time" INTEGER,
    "responsible_user_id" UUID,
    "supplier_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "act_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requirement_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "act_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requirement_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "public_url" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "act_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_timeline" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requirement_id" UUID NOT NULL,
    "changed_by" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "prev_status_id" UUID,
    "new_status_id" UUID,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "act_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "act_activity_types_name_key" ON "act_activity_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "act_activity_types_code_key" ON "act_activity_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "act_priorities_name_key" ON "act_priorities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "act_priorities_code_key" ON "act_priorities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "act_status_reqs_name_key" ON "act_status_reqs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "act_status_reqs_code_key" ON "act_status_reqs"("code");

-- CreateIndex
CREATE UNIQUE INDEX "act_requirements_folio_key" ON "act_requirements"("folio");

-- CreateIndex
CREATE INDEX "act_requirements_status_id_idx" ON "act_requirements"("status_id");

-- CreateIndex
CREATE INDEX "act_requirements_priority_id_idx" ON "act_requirements"("priority_id");

-- CreateIndex
CREATE INDEX "act_requirements_activity_type_id_idx" ON "act_requirements"("activity_type_id");

-- CreateIndex
CREATE INDEX "act_requirements_applicant_user_id_idx" ON "act_requirements"("applicant_user_id");

-- CreateIndex
CREATE INDEX "act_requirements_responsible_user_id_idx" ON "act_requirements"("responsible_user_id");

-- CreateIndex
CREATE INDEX "act_activities_requirement_id_idx" ON "act_activities"("requirement_id");

-- CreateIndex
CREATE INDEX "act_comments_requirement_id_idx" ON "act_comments"("requirement_id");

-- CreateIndex
CREATE INDEX "act_attachments_requirement_id_idx" ON "act_attachments"("requirement_id");

-- CreateIndex
CREATE INDEX "act_timeline_requirement_id_idx" ON "act_timeline"("requirement_id");

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "act_activity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_priority_id_fkey" FOREIGN KEY ("priority_id") REFERENCES "act_priorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "act_status_reqs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "mnt_activity_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_applicant_user_id_fkey" FOREIGN KEY ("applicant_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activities" ADD CONSTRAINT "act_activities_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "act_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activities" ADD CONSTRAINT "act_activities_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "act_activity_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activities" ADD CONSTRAINT "act_activities_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activities" ADD CONSTRAINT "act_activities_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "mnt_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_comments" ADD CONSTRAINT "act_comments_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "act_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_comments" ADD CONSTRAINT "act_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_attachments" ADD CONSTRAINT "act_attachments_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "act_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_attachments" ADD CONSTRAINT "act_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_timeline" ADD CONSTRAINT "act_timeline_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "act_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_timeline" ADD CONSTRAINT "act_timeline_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_timeline" ADD CONSTRAINT "act_timeline_prev_status_id_fkey" FOREIGN KEY ("prev_status_id") REFERENCES "act_status_reqs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_timeline" ADD CONSTRAINT "act_timeline_new_status_id_fkey" FOREIGN KEY ("new_status_id") REFERENCES "act_status_reqs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
