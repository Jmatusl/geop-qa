-- AlterTable
ALTER TABLE "bodega_internal_requests" ADD COLUMN     "external_reference" VARCHAR(100),
ADD COLUMN     "metadatos" JSONB;
