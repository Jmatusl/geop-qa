-- AddForeignKey
ALTER TABLE "bodega_stock_movements" ADD CONSTRAINT "bodega_stock_movements_applied_by_fkey" FOREIGN KEY ("applied_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
