-- AlterTable
ALTER TABLE "bodega_stock" ADD COLUMN     "stock_no_verificado" DECIMAL(14,3) NOT NULL DEFAULT 0,
ADD COLUMN     "stock_verificado" DECIMAL(14,3) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "bodega_stock_movement_items" ADD COLUMN     "cantidad_verificada" DECIMAL(14,3),
ADD COLUMN     "fecha_verificacion" TIMESTAMPTZ(6),
ADD COLUMN     "verificado_por_id" UUID;
