-- CreateTable
CREATE TABLE "bodega_internal_request_status_master" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "color" VARCHAR(20),
    "icon" VARCHAR(50),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bodega_internal_request_status_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodega_warehouses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bodega_warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodega_articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "part_number" VARCHAR(100),
    "brand" VARCHAR(100),
    "model" VARCHAR(100),
    "internal_code" VARCHAR(50),
    "article_type" VARCHAR(50),
    "quality" VARCHAR(50),
    "is_critical" BOOLEAN NOT NULL DEFAULT false,
    "unit" VARCHAR(20) NOT NULL DEFAULT 'UNI',
    "minimum_stock" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bodega_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodega_stock" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "warehouse_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "reserved_quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bodega_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodega_internal_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "folio" VARCHAR(50) NOT NULL,
    "status_code" VARCHAR(50) NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "required_date" DATE,
    "observations" TEXT,
    "requested_by" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bodega_internal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodega_internal_request_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "delivered_quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "observations" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bodega_internal_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodega_internal_request_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "bodega_internal_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodega_stock_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "folio" VARCHAR(50) NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "request_id" UUID,
    "movement_type" VARCHAR(30) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    "reason" TEXT,
    "observations" TEXT,
    "approved_at" TIMESTAMPTZ(6),
    "approved_by" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bodega_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodega_stock_movement_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "movement_id" UUID NOT NULL,
    "request_item_id" UUID,
    "article_id" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit_cost" DECIMAL(14,2),
    "initial_balance" DECIMAL(14,3),
    "current_balance" DECIMAL(14,3),
    "parent_movement_item_id" UUID,
    "location" VARCHAR(150),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bodega_stock_movement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodega_lots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(80) NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "source_movement_item_id" UUID,
    "initial_quantity" DECIMAL(14,3) NOT NULL,
    "current_quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(14,2),
    "manufacture_date" DATE,
    "expiration_date" DATE,
    "provider" VARCHAR(255),
    "invoice_number" VARCHAR(100),
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
    "observations" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bodega_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodega_serial_numbers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lot_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "source_movement_item_id" UUID,
    "serial_number" VARCHAR(120) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DISPONIBLE',
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bodega_serial_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodega_reservations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_item_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
    "expires_at" TIMESTAMPTZ(6),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMPTZ(6),

    CONSTRAINT "bodega_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodega_cost_centers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bodega_cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodega_adjustment_reasons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bodega_adjustment_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bodega_internal_request_status_master_code_key" ON "bodega_internal_request_status_master"("code");

-- CreateIndex
CREATE UNIQUE INDEX "bodega_warehouses_code_key" ON "bodega_warehouses"("code");

-- CreateIndex
CREATE INDEX "bodega_warehouses_is_active_idx" ON "bodega_warehouses"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "bodega_articles_code_key" ON "bodega_articles"("code");

-- CreateIndex
CREATE INDEX "bodega_articles_is_active_idx" ON "bodega_articles"("is_active");

-- CreateIndex
CREATE INDEX "bodega_stock_article_id_idx" ON "bodega_stock"("article_id");

-- CreateIndex
CREATE UNIQUE INDEX "bodega_stock_warehouse_id_article_id_key" ON "bodega_stock"("warehouse_id", "article_id");

-- CreateIndex
CREATE UNIQUE INDEX "bodega_internal_requests_folio_key" ON "bodega_internal_requests"("folio");

-- CreateIndex
CREATE INDEX "bodega_internal_requests_status_code_idx" ON "bodega_internal_requests"("status_code");

-- CreateIndex
CREATE INDEX "bodega_internal_requests_warehouse_id_idx" ON "bodega_internal_requests"("warehouse_id");

-- CreateIndex
CREATE INDEX "bodega_internal_requests_requested_by_idx" ON "bodega_internal_requests"("requested_by");

-- CreateIndex
CREATE INDEX "bodega_internal_requests_created_by_idx" ON "bodega_internal_requests"("created_by");

-- CreateIndex
CREATE INDEX "bodega_internal_requests_created_at_idx" ON "bodega_internal_requests"("created_at");

-- CreateIndex
CREATE INDEX "bodega_internal_request_items_request_id_idx" ON "bodega_internal_request_items"("request_id");

-- CreateIndex
CREATE INDEX "bodega_internal_request_items_article_id_idx" ON "bodega_internal_request_items"("article_id");

-- CreateIndex
CREATE INDEX "bodega_internal_request_logs_request_id_idx" ON "bodega_internal_request_logs"("request_id");

-- CreateIndex
CREATE INDEX "bodega_internal_request_logs_created_at_idx" ON "bodega_internal_request_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "bodega_stock_movements_folio_key" ON "bodega_stock_movements"("folio");

-- CreateIndex
CREATE INDEX "bodega_stock_movements_warehouse_id_idx" ON "bodega_stock_movements"("warehouse_id");

-- CreateIndex
CREATE INDEX "bodega_stock_movements_request_id_idx" ON "bodega_stock_movements"("request_id");

-- CreateIndex
CREATE INDEX "bodega_stock_movements_status_idx" ON "bodega_stock_movements"("status");

-- CreateIndex
CREATE INDEX "bodega_stock_movements_movement_type_idx" ON "bodega_stock_movements"("movement_type");

-- CreateIndex
CREATE INDEX "bodega_stock_movements_created_at_idx" ON "bodega_stock_movements"("created_at");

-- CreateIndex
CREATE INDEX "bodega_stock_movement_items_movement_id_idx" ON "bodega_stock_movement_items"("movement_id");

-- CreateIndex
CREATE INDEX "bodega_stock_movement_items_article_id_idx" ON "bodega_stock_movement_items"("article_id");

-- CreateIndex
CREATE INDEX "bodega_stock_movement_items_request_item_id_idx" ON "bodega_stock_movement_items"("request_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "bodega_lots_code_key" ON "bodega_lots"("code");

-- CreateIndex
CREATE INDEX "bodega_lots_warehouse_id_idx" ON "bodega_lots"("warehouse_id");

-- CreateIndex
CREATE INDEX "bodega_lots_article_id_idx" ON "bodega_lots"("article_id");

-- CreateIndex
CREATE INDEX "bodega_lots_status_idx" ON "bodega_lots"("status");

-- CreateIndex
CREATE INDEX "bodega_lots_expiration_date_idx" ON "bodega_lots"("expiration_date");

-- CreateIndex
CREATE INDEX "bodega_lots_created_at_idx" ON "bodega_lots"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "bodega_serial_numbers_serial_number_key" ON "bodega_serial_numbers"("serial_number");

-- CreateIndex
CREATE INDEX "bodega_serial_numbers_lot_id_idx" ON "bodega_serial_numbers"("lot_id");

-- CreateIndex
CREATE INDEX "bodega_serial_numbers_warehouse_id_idx" ON "bodega_serial_numbers"("warehouse_id");

-- CreateIndex
CREATE INDEX "bodega_serial_numbers_article_id_idx" ON "bodega_serial_numbers"("article_id");

-- CreateIndex
CREATE INDEX "bodega_serial_numbers_status_idx" ON "bodega_serial_numbers"("status");

-- CreateIndex
CREATE INDEX "bodega_serial_numbers_created_at_idx" ON "bodega_serial_numbers"("created_at");

-- CreateIndex
CREATE INDEX "bodega_reservations_request_item_id_idx" ON "bodega_reservations"("request_item_id");

-- CreateIndex
CREATE INDEX "bodega_reservations_warehouse_id_idx" ON "bodega_reservations"("warehouse_id");

-- CreateIndex
CREATE INDEX "bodega_reservations_article_id_idx" ON "bodega_reservations"("article_id");

-- CreateIndex
CREATE INDEX "bodega_reservations_status_idx" ON "bodega_reservations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bodega_cost_centers_code_key" ON "bodega_cost_centers"("code");

-- CreateIndex
CREATE INDEX "bodega_cost_centers_is_active_idx" ON "bodega_cost_centers"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "bodega_adjustment_reasons_code_key" ON "bodega_adjustment_reasons"("code");

-- CreateIndex
CREATE INDEX "bodega_adjustment_reasons_is_active_idx" ON "bodega_adjustment_reasons"("is_active");

-- CreateIndex
CREATE INDEX "bodega_adjustment_reasons_type_idx" ON "bodega_adjustment_reasons"("type");

-- AddForeignKey
ALTER TABLE "bodega_stock" ADD CONSTRAINT "bodega_stock_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "bodega_warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_stock" ADD CONSTRAINT "bodega_stock_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "bodega_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_internal_requests" ADD CONSTRAINT "bodega_internal_requests_status_code_fkey" FOREIGN KEY ("status_code") REFERENCES "bodega_internal_request_status_master"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_internal_requests" ADD CONSTRAINT "bodega_internal_requests_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "bodega_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_internal_requests" ADD CONSTRAINT "bodega_internal_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_internal_requests" ADD CONSTRAINT "bodega_internal_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_internal_request_items" ADD CONSTRAINT "bodega_internal_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "bodega_internal_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_internal_request_items" ADD CONSTRAINT "bodega_internal_request_items_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "bodega_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_internal_request_logs" ADD CONSTRAINT "bodega_internal_request_logs_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "bodega_internal_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_internal_request_logs" ADD CONSTRAINT "bodega_internal_request_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_stock_movements" ADD CONSTRAINT "bodega_stock_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "bodega_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_stock_movements" ADD CONSTRAINT "bodega_stock_movements_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "bodega_internal_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_stock_movements" ADD CONSTRAINT "bodega_stock_movements_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_stock_movements" ADD CONSTRAINT "bodega_stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_stock_movement_items" ADD CONSTRAINT "bodega_stock_movement_items_movement_id_fkey" FOREIGN KEY ("movement_id") REFERENCES "bodega_stock_movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_stock_movement_items" ADD CONSTRAINT "bodega_stock_movement_items_request_item_id_fkey" FOREIGN KEY ("request_item_id") REFERENCES "bodega_internal_request_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_stock_movement_items" ADD CONSTRAINT "bodega_stock_movement_items_parent_movement_item_id_fkey" FOREIGN KEY ("parent_movement_item_id") REFERENCES "bodega_stock_movement_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_stock_movement_items" ADD CONSTRAINT "bodega_stock_movement_items_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "bodega_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_lots" ADD CONSTRAINT "bodega_lots_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "bodega_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_lots" ADD CONSTRAINT "bodega_lots_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "bodega_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_lots" ADD CONSTRAINT "bodega_lots_source_movement_item_id_fkey" FOREIGN KEY ("source_movement_item_id") REFERENCES "bodega_stock_movement_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_lots" ADD CONSTRAINT "bodega_lots_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_serial_numbers" ADD CONSTRAINT "bodega_serial_numbers_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "bodega_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_serial_numbers" ADD CONSTRAINT "bodega_serial_numbers_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "bodega_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_serial_numbers" ADD CONSTRAINT "bodega_serial_numbers_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "bodega_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_serial_numbers" ADD CONSTRAINT "bodega_serial_numbers_source_movement_item_id_fkey" FOREIGN KEY ("source_movement_item_id") REFERENCES "bodega_stock_movement_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_serial_numbers" ADD CONSTRAINT "bodega_serial_numbers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_reservations" ADD CONSTRAINT "bodega_reservations_request_item_id_fkey" FOREIGN KEY ("request_item_id") REFERENCES "bodega_internal_request_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_reservations" ADD CONSTRAINT "bodega_reservations_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "bodega_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_reservations" ADD CONSTRAINT "bodega_reservations_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "bodega_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega_reservations" ADD CONSTRAINT "bodega_reservations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
