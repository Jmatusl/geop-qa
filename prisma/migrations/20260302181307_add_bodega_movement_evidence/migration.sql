-- CreateTable
CREATE TABLE "bodega_movement_evidences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "movement_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "file_type" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bodega_movement_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bodega_movement_evidences_movement_id_idx" ON "bodega_movement_evidences"("movement_id");

-- AddForeignKey
ALTER TABLE "bodega_movement_evidences" ADD CONSTRAINT "bodega_movement_evidences_movement_id_fkey" FOREIGN KEY ("movement_id") REFERENCES "bodega_stock_movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
