-- CreateTable
CREATE TABLE "act_activity_receptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activity_id" UUID NOT NULL,
    "is_accepted" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "received_by_id" UUID NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "act_activity_receptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_reception_evidences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reception_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "public_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" VARCHAR(50),
    "captured_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "act_reception_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "act_activity_receptions_activity_id_idx" ON "act_activity_receptions"("activity_id");

-- CreateIndex
CREATE INDEX "act_activity_receptions_received_by_id_idx" ON "act_activity_receptions"("received_by_id");

-- CreateIndex
CREATE INDEX "act_reception_evidences_reception_id_idx" ON "act_reception_evidences"("reception_id");

-- AddForeignKey
ALTER TABLE "act_activity_receptions" ADD CONSTRAINT "act_activity_receptions_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "act_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activity_receptions" ADD CONSTRAINT "act_activity_receptions_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_reception_evidences" ADD CONSTRAINT "act_reception_evidences_reception_id_fkey" FOREIGN KEY ("reception_id") REFERENCES "act_activity_receptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
