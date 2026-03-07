-- AlterTable
ALTER TABLE "bodega_stock_movements" ADD COLUMN     "applied_at" TIMESTAMPTZ(6),
ADD COLUMN     "applied_by" UUID;
