-- AlterTable
ALTER TABLE "supply_quotation_items" ALTER COLUMN "unit_price" DROP NOT NULL,
ALTER COLUMN "subtotal" DROP NOT NULL;

-- AlterTable
ALTER TABLE "supply_quotations" ADD COLUMN     "quotation_number" VARCHAR(100);
