-- CreateTable
CREATE TABLE "act_activity_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activity_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "public_url" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "act_activity_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "act_activity_attachments_activity_id_idx" ON "act_activity_attachments"("activity_id");

-- AddForeignKey
ALTER TABLE "act_activity_attachments" ADD CONSTRAINT "act_activity_attachments_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "act_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activity_attachments" ADD CONSTRAINT "act_activity_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
