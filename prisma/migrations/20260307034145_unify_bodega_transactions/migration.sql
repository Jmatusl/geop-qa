/*
  Warnings:

  - You are about to drop the `bodega_internal_request_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bodega_internal_request_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bodega_internal_request_status_master` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bodega_internal_requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bodega_movement_evidences` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bodega_stock_movement_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bodega_stock_movements` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "bodega_internal_request_items" DROP CONSTRAINT "bodega_internal_request_items_article_id_fkey";

-- DropForeignKey
ALTER TABLE "bodega_internal_request_items" DROP CONSTRAINT "bodega_internal_request_items_request_id_fkey";

-- DropForeignKey
ALTER TABLE "bodega_internal_request_items" DROP CONSTRAINT "bodega_internal_request_items_warehouse_id_fkey";

-- DropForeignKey
ALTER TABLE "bodega_internal_request_logs" DROP CONSTRAINT "bodega_internal_request_logs_created_by_fkey";

-- DropForeignKey
ALTER TABLE "bodega_internal_request_logs" DROP CONSTRAINT "bodega_internal_request_logs_request_id_fkey";

-- DropForeignKey
ALTER TABLE "bodega_internal_requests" DROP CONSTRAINT "bodega_internal_requests_created_by_fkey";

-- DropForeignKey
ALTER TABLE "bodega_internal_requests" DROP CONSTRAINT "bodega_internal_requests_requested_by_fkey";

-- DropForeignKey
ALTER TABLE "bodega_internal_requests" DROP CONSTRAINT "bodega_internal_requests_status_code_fkey";

-- DropForeignKey
ALTER TABLE "bodega_internal_requests" DROP CONSTRAINT "bodega_internal_requests_warehouse_id_fkey";

-- DropForeignKey
ALTER TABLE "bodega_lots" DROP CONSTRAINT "bodega_lots_source_movement_item_id_fkey";

-- DropForeignKey
ALTER TABLE "bodega_movement_evidences" DROP CONSTRAINT "bodega_movement_evidences_movement_id_fkey";

-- DropForeignKey
ALTER TABLE "bodega_movement_evidences" DROP CONSTRAINT "bodega_movement_evidences_movement_item_id_fkey";

-- DropForeignKey
ALTER TABLE "bodega_reservations" DROP CONSTRAINT "bodega_reservations_request_item_id_fkey";

-- DropForeignKey
ALTER TABLE "bodega_serial_numbers" DROP CONSTRAINT "bodega_serial_numbers_source_movement_item_id_fkey";

-- DropForeignKey
ALTER TABLE "bodega_stock_movement_items" DROP CONSTRAINT "bodega_stock_movement_items_article_id_fkey";

-- DropForeignKey
ALTER TABLE "bodega_stock_movement_items" DROP CONSTRAINT "bodega_stock_movement_items_movement_id_fkey";

-- DropForeignKey
ALTER TABLE "bodega_stock_movement_items" DROP CONSTRAINT "bodega_stock_movement_items_parent_movement_item_id_fkey";

-- DropForeignKey
ALTER TABLE "bodega_stock_movement_items" DROP CONSTRAINT "bodega_stock_movement_items_request_item_id_fkey";

-- DropForeignKey
ALTER TABLE "bodega_stock_movements" DROP CONSTRAINT "bodega_stock_movements_applied_by_fkey";

-- DropForeignKey
ALTER TABLE "bodega_stock_movements" DROP CONSTRAINT "bodega_stock_movements_approved_by_fkey";

-- DropForeignKey
ALTER TABLE "bodega_stock_movements" DROP CONSTRAINT "bodega_stock_movements_created_by_fkey";

-- DropForeignKey
ALTER TABLE "bodega_stock_movements" DROP CONSTRAINT "bodega_stock_movements_request_id_fkey";

-- DropForeignKey
ALTER TABLE "bodega_stock_movements" DROP CONSTRAINT "bodega_stock_movements_warehouse_id_fkey";

-- AlterTable
ALTER TABLE "bodega_serial_numbers" ADD COLUMN     "userId" UUID;

-- DropTable
DROP TABLE "bodega_internal_request_items";

-- DropTable
DROP TABLE "bodega_internal_request_logs";

-- DropTable
DROP TABLE "bodega_internal_request_status_master";

-- DropTable
DROP TABLE "bodega_internal_requests";

-- DropTable
DROP TABLE "bodega_movement_evidences";

-- DropTable
DROP TABLE "bodega_stock_movement_items";

-- DropTable
DROP TABLE "bodega_stock_movements";

-- CreateTable
CREATE TABLE "bodega_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "folio" VARCHAR(50) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    "warehouse_id" UUID NOT NULL,
    "target_warehouse_id" UUID,
    "title" VARCHAR(255),
    "description" TEXT,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "required_date" DATE,
    "requested_by" UUID,
    "responsable" VARCHAR(150),
    "reason" TEXT,
    "observations" TEXT,
    "external_reference" VARCHAR(100),
    "metadata" JSONB,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "applied_by" UUID,
    "applied_at" TIMESTAMPTZ(6),
    "bodegaWarehouseId" UUID,

    CONSTRAINT "bodega_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodega_transaction_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "delivered_quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(14,2),
    "initial_balance" DECIMAL(14,3),
    "current_balance" DECIMAL(14,3),
    "cantidad_verificada" DECIMAL(14,3),
    "fecha_verificacion" TIMESTAMPTZ(6),
    "verificado_por_id" UUID,
    "observations" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bodega_transaction_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodega_transaction_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "bodega_transaction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodega_transaction_evidences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_id" UUID NOT NULL,
    "transaction_item_id" UUID,
    "url" TEXT NOT NULL,
    "key" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "file_type" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bodega_transaction_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bodega_transactions_folio_key" ON "bodega_transactions"("folio");

-- CreateIndex
CREATE INDEX "bodega_transactions_type_idx" ON "bodega_transactions"("type");

-- CreateIndex
CREATE INDEX "bodega_transactions_status_idx" ON "bodega_transactions"("status");

-- CreateIndex
CREATE INDEX "bodega_transactions_warehouse_id_idx" ON "bodega_transactions"("warehouse_id");

-- CreateIndex
CREATE INDEX "bodega_transactions_requested_by_idx" ON "bodega_transactions"("requested_by");

-- CreateIndex
CREATE INDEX "bodega_transactions_created_by_idx" ON "bodega_transactions"("created_by");

-- CreateIndex
CREATE INDEX "bodega_transactions_created_at_idx" ON "bodega_transactions"("created_at");

-- CreateIndex
CREATE INDEX "bodega_transaction_items_transaction_id_idx" ON "bodega_transaction_items"("transaction_id");

-- CreateIndex
CREATE INDEX "bodega_transaction_items_article_id_idx" ON "bodega_transaction_items"("article_id");

-- CreateIndex
CREATE INDEX "bodega_transaction_logs_transaction_id_idx" ON "bodega_transaction_logs"("transaction_id");

-- CreateIndex
CREATE INDEX "bodega_transaction_logs_created_at_idx" ON "bodega_transaction_logs"("created_at");

-- CreateIndex
CREATE INDEX "bodega_transaction_evidences_transaction_id_idx" ON "bodega_transaction_evidences"("transaction_id");

-- CreateIndex
CREATE INDEX "bodega_transaction_evidences_transaction_item_id_idx" ON "bodega_transaction_evidences"("transaction_item_id");

-- AddForeignKey
ALTER TABLE "bodega_transactions" ADD CONSTRAINT "bodega_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_transactions" ADD CONSTRAINT "bodega_transactions_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_transactions" ADD CONSTRAINT "bodega_transactions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_transactions" ADD CONSTRAINT "bodega_transactions_applied_by_fkey" FOREIGN KEY ("applied_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_transactions" ADD CONSTRAINT "bodega_transactions_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "bodega_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_transactions" ADD CONSTRAINT "bodega_transactions_target_warehouse_id_fkey" FOREIGN KEY ("target_warehouse_id") REFERENCES "bodega_warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_transactions" ADD CONSTRAINT "bodega_transactions_bodegaWarehouseId_fkey" FOREIGN KEY ("bodegaWarehouseId") REFERENCES "bodega_warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_transaction_items" ADD CONSTRAINT "bodega_transaction_items_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "bodega_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_transaction_items" ADD CONSTRAINT "bodega_transaction_items_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "bodega_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_transaction_logs" ADD CONSTRAINT "bodega_transaction_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_transaction_logs" ADD CONSTRAINT "bodega_transaction_logs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "bodega_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_transaction_evidences" ADD CONSTRAINT "bodega_transaction_evidences_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "bodega_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_transaction_evidences" ADD CONSTRAINT "bodega_transaction_evidences_transaction_item_id_fkey" FOREIGN KEY ("transaction_item_id") REFERENCES "bodega_transaction_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_lots" ADD CONSTRAINT "bodega_lots_source_movement_item_id_fkey" FOREIGN KEY ("source_movement_item_id") REFERENCES "bodega_transaction_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_serial_numbers" ADD CONSTRAINT "bodega_serial_numbers_source_movement_item_id_fkey" FOREIGN KEY ("source_movement_item_id") REFERENCES "bodega_transaction_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_serial_numbers" ADD CONSTRAINT "bodega_serial_numbers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_reservations" ADD CONSTRAINT "bodega_reservations_transaction_fkey" FOREIGN KEY ("request_item_id") REFERENCES "bodega_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_reservations" ADD CONSTRAINT "bodega_reservations_item_fkey" FOREIGN KEY ("request_item_id") REFERENCES "bodega_transaction_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
