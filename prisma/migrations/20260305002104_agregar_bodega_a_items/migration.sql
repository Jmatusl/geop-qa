-- AlterTable
ALTER TABLE "bodega_internal_request_items" ADD COLUMN     "warehouse_id" UUID;

-- AddForeignKey
ALTER TABLE "bodega_internal_request_items" ADD CONSTRAINT "bodega_internal_request_items_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "bodega_warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
