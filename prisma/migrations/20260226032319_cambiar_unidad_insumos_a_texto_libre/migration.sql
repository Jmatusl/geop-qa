/*
  Warnings:

  - You are about to drop the column `unit_id` on the `supply_request_items` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "supply_request_items" DROP CONSTRAINT "supply_request_items_unit_id_fkey";

-- AlterTable
ALTER TABLE "supply_request_items" DROP COLUMN "unit_id",
ADD COLUMN     "unit" VARCHAR(50) NOT NULL DEFAULT 'UNI';
