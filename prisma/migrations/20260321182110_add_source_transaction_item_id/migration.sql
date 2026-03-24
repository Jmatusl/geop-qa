/*
  Warnings:

  - You are about to drop the column `request_item_id` on the `bodega_reservations` table. All the data in the column will be lost.
  - Added the required column `transaction_id` to the `bodega_reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transaction_item_id` to the `bodega_reservations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "bodega_reservations" DROP CONSTRAINT "bodega_reservations_item_fkey";

-- DropForeignKey
ALTER TABLE "bodega_reservations" DROP CONSTRAINT "bodega_reservations_transaction_fkey";

-- DropIndex
DROP INDEX "bodega_reservations_request_item_id_idx";

-- AlterTable
ALTER TABLE "bodega_reservations" DROP COLUMN "request_item_id",
ADD COLUMN     "transaction_id" UUID NOT NULL,
ADD COLUMN     "transaction_item_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "bodega_transaction_items" ADD COLUMN     "source_transaction_item_id" UUID;

-- CreateIndex
CREATE INDEX "bodega_reservations_transaction_id_idx" ON "bodega_reservations"("transaction_id");

-- CreateIndex
CREATE INDEX "bodega_reservations_transaction_item_id_idx" ON "bodega_reservations"("transaction_item_id");

-- AddForeignKey
ALTER TABLE "bodega_reservations" ADD CONSTRAINT "bodega_reservations_transaction_fkey" FOREIGN KEY ("transaction_id") REFERENCES "bodega_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_reservations" ADD CONSTRAINT "bodega_item_reservation_fkey" FOREIGN KEY ("transaction_item_id") REFERENCES "bodega_transaction_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
