-- Migración consolidada: Módulo de Solicitud de Insumos
-- Incluye todas las tablas y campos necesarios para el módulo completo

-- ============================================
-- TABLAS MAESTRAS
-- ============================================

-- CreateTable: Unidades de Medida
CREATE TABLE "unit_master" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(10) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "conversion_factor" DOUBLE PRECISION,
    "base_unit" VARCHAR(10),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "unit_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Estados de Solicitud de Insumos
CREATE TABLE "supply_request_status_master" (
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

    CONSTRAINT "supply_request_status_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Estados de Items de Solicitud
CREATE TABLE "supply_item_status_master" (
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

    CONSTRAINT "supply_item_status_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Estados de Cotizaciones
CREATE TABLE "quotation_status_master" (
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

    CONSTRAINT "quotation_status_master_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- TABLAS PRINCIPALES
-- ============================================

-- CreateTable: Solicitudes de Insumos
CREATE TABLE "supply_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "folio" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status_code" VARCHAR(50) NOT NULL,
    "installation_id" UUID NOT NULL,
    "requested_date" DATE NOT NULL,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "justification" TEXT,
    "observations" TEXT,
    "estimated_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "supply_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Items de Solicitud
CREATE TABLE "supply_request_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "item_name" VARCHAR(255) NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" VARCHAR(50) NOT NULL DEFAULT 'UNI',
    "status_code" VARCHAR(50) NOT NULL,
    "specifications" TEXT,
    "estimated_price" DOUBLE PRECISION,
    "observations" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "supply_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Cotizaciones
CREATE TABLE "supply_quotations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "folio" VARCHAR(50) NOT NULL,
    "request_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "status_code" VARCHAR(50) NOT NULL,
    "quotation_date" DATE,
    "expiration_date" DATE,
    "total_amount" DOUBLE PRECISION,
    "observations" TEXT,
    "observations_for_supplier" TEXT,
    "purchase_order_number" VARCHAR(100),
    "quotation_number" VARCHAR(100),
    "sent_at" TIMESTAMPTZ(6),
    "sent_by" UUID,
    "received_at" TIMESTAMPTZ(6),
    "received_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "approved_by" UUID,
    "rejected_at" TIMESTAMPTZ(6),
    "rejected_by" UUID,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "supply_quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Items de Cotización
CREATE TABLE "supply_quotation_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quotation_id" UUID NOT NULL,
    "request_item_id" UUID NOT NULL,
    "quoted_quantity" DOUBLE PRECISION NOT NULL,
    "unit_price" DOUBLE PRECISION,
    "subtotal" DOUBLE PRECISION,
    "supplier_notes" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "supply_quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Archivos Adjuntos de Solicitudes
CREATE TABLE "supply_request_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supply_request_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Archivos Adjuntos de Cotizaciones
CREATE TABLE "supply_quotation_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quotation_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supply_quotation_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Timeline de Solicitudes
CREATE TABLE "supply_request_timeline" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "supply_request_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Registro de Emails Enviados
CREATE TABLE "supply_quotation_emails_sent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quotation_id" UUID NOT NULL,
    "recipient_email" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "body_html" TEXT NOT NULL,
    "attached_pdf" TEXT,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_by" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'sent',
    "error_message" TEXT,

    CONSTRAINT "supply_quotation_emails_sent_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- ÍNDICES
-- ============================================

-- Índices para unit_master
CREATE UNIQUE INDEX "unit_master_code_key" ON "unit_master"("code");

-- Índices para supply_request_status_master
CREATE UNIQUE INDEX "supply_request_status_master_code_key" ON "supply_request_status_master"("code");

-- Índices para supply_item_status_master
CREATE UNIQUE INDEX "supply_item_status_master_code_key" ON "supply_item_status_master"("code");

-- Índices para quotation_status_master
CREATE UNIQUE INDEX "quotation_status_master_code_key" ON "quotation_status_master"("code");

-- Índices para supply_requests
CREATE UNIQUE INDEX "supply_requests_folio_key" ON "supply_requests"("folio");
CREATE INDEX "supply_requests_folio_idx" ON "supply_requests"("folio");
CREATE INDEX "supply_requests_status_code_idx" ON "supply_requests"("status_code");
CREATE INDEX "supply_requests_installation_id_idx" ON "supply_requests"("installation_id");
CREATE INDEX "supply_requests_created_by_idx" ON "supply_requests"("created_by");
CREATE INDEX "supply_requests_requested_date_idx" ON "supply_requests"("requested_date");
CREATE INDEX "supply_requests_priority_idx" ON "supply_requests"("priority");

-- Índices para supply_request_items
CREATE INDEX "supply_request_items_request_id_idx" ON "supply_request_items"("request_id");
CREATE INDEX "supply_request_items_category_id_idx" ON "supply_request_items"("category_id");
CREATE INDEX "supply_request_items_status_code_idx" ON "supply_request_items"("status_code");

-- Índices para supply_quotations
CREATE UNIQUE INDEX "supply_quotations_folio_key" ON "supply_quotations"("folio");
CREATE INDEX "supply_quotations_folio_idx" ON "supply_quotations"("folio");
CREATE INDEX "supply_quotations_request_id_idx" ON "supply_quotations"("request_id");
CREATE INDEX "supply_quotations_supplier_id_idx" ON "supply_quotations"("supplier_id");
CREATE INDEX "supply_quotations_status_code_idx" ON "supply_quotations"("status_code");
CREATE INDEX "supply_quotations_created_by_idx" ON "supply_quotations"("created_by");

-- Índices para supply_quotation_items
CREATE INDEX "supply_quotation_items_quotation_id_idx" ON "supply_quotation_items"("quotation_id");
CREATE INDEX "supply_quotation_items_request_item_id_idx" ON "supply_quotation_items"("request_item_id");
CREATE UNIQUE INDEX "supply_quotation_items_quotation_id_request_item_id_key" ON "supply_quotation_items"("quotation_id", "request_item_id");

-- Índices para supply_request_attachments
CREATE INDEX "supply_request_attachments_request_id_idx" ON "supply_request_attachments"("request_id");

-- Índices para supply_quotation_attachments
CREATE INDEX "supply_quotation_attachments_quotation_id_idx" ON "supply_quotation_attachments"("quotation_id");

-- Índices para supply_request_timeline
CREATE INDEX "supply_request_timeline_request_id_idx" ON "supply_request_timeline"("request_id");
CREATE INDEX "supply_request_timeline_created_at_idx" ON "supply_request_timeline"("created_at");

-- Índices para supply_quotation_emails_sent
CREATE INDEX "supply_quotation_emails_sent_quotation_id_idx" ON "supply_quotation_emails_sent"("quotation_id");
CREATE INDEX "supply_quotation_emails_sent_sent_at_idx" ON "supply_quotation_emails_sent"("sent_at");

-- ============================================
-- FOREIGN KEYS
-- ============================================

-- Foreign Keys para supply_requests
ALTER TABLE "supply_requests" ADD CONSTRAINT "supply_requests_status_code_fkey" FOREIGN KEY ("status_code") REFERENCES "supply_request_status_master"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supply_requests" ADD CONSTRAINT "supply_requests_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "mnt_installations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supply_requests" ADD CONSTRAINT "supply_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign Keys para supply_request_items
ALTER TABLE "supply_request_items" ADD CONSTRAINT "supply_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "supply_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supply_request_items" ADD CONSTRAINT "supply_request_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "mnt_supply_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supply_request_items" ADD CONSTRAINT "supply_request_items_status_code_fkey" FOREIGN KEY ("status_code") REFERENCES "supply_item_status_master"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign Keys para supply_quotations
ALTER TABLE "supply_quotations" ADD CONSTRAINT "supply_quotations_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "supply_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supply_quotations" ADD CONSTRAINT "supply_quotations_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "mnt_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supply_quotations" ADD CONSTRAINT "supply_quotations_status_code_fkey" FOREIGN KEY ("status_code") REFERENCES "quotation_status_master"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supply_quotations" ADD CONSTRAINT "supply_quotations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supply_quotations" ADD CONSTRAINT "supply_quotations_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "supply_quotations" ADD CONSTRAINT "supply_quotations_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "supply_quotations" ADD CONSTRAINT "supply_quotations_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "supply_quotations" ADD CONSTRAINT "supply_quotations_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys para supply_quotation_items
ALTER TABLE "supply_quotation_items" ADD CONSTRAINT "supply_quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "supply_quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supply_quotation_items" ADD CONSTRAINT "supply_quotation_items_request_item_id_fkey" FOREIGN KEY ("request_item_id") REFERENCES "supply_request_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign Keys para supply_request_attachments
ALTER TABLE "supply_request_attachments" ADD CONSTRAINT "supply_request_attachments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "supply_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supply_request_attachments" ADD CONSTRAINT "supply_request_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign Keys para supply_quotation_attachments
ALTER TABLE "supply_quotation_attachments" ADD CONSTRAINT "supply_quotation_attachments_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "supply_quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supply_quotation_attachments" ADD CONSTRAINT "supply_quotation_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign Keys para supply_request_timeline
ALTER TABLE "supply_request_timeline" ADD CONSTRAINT "supply_request_timeline_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "supply_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supply_request_timeline" ADD CONSTRAINT "supply_request_timeline_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys para supply_quotation_emails_sent
ALTER TABLE "supply_quotation_emails_sent" ADD CONSTRAINT "supply_quotation_emails_sent_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "supply_quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supply_quotation_emails_sent" ADD CONSTRAINT "supply_quotation_emails_sent_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
