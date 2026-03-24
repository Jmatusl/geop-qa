-- AlterTable
ALTER TABLE "bodega_transaction_items" ADD COLUMN     "warehouse_id" UUID;

-- CreateIndex
CREATE INDEX "bodega_transaction_items_warehouse_id_idx" ON "bodega_transaction_items"("warehouse_id");

-- AddForeignKey
ALTER TABLE "bodega_transaction_items" ADD CONSTRAINT "bodega_transaction_items_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "bodega_warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
