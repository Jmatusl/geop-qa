-- AlterTable
ALTER TABLE "bodega_movement_evidences" ADD COLUMN     "movement_item_id" UUID;

-- CreateIndex
CREATE INDEX "bodega_movement_evidences_movement_item_id_idx" ON "bodega_movement_evidences"("movement_item_id");

-- AddForeignKey
ALTER TABLE "bodega_movement_evidences" ADD CONSTRAINT "bodega_movement_evidences_movement_item_id_fkey" FOREIGN KEY ("movement_item_id") REFERENCES "bodega_stock_movement_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
