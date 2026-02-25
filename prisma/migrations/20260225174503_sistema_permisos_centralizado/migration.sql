-- CreateTable
CREATE TABLE "modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "module_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "module_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_module_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by" UUID,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_module_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_notification_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "module_id" UUID NOT NULL,
    "event_key" VARCHAR(100) NOT NULL,
    "event_name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "recipients" JSONB,
    "template" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "module_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_approval_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "module_id" UUID NOT NULL,
    "rule_key" VARCHAR(100) NOT NULL,
    "rule_name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "configuration" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "module_approval_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "modules_code_key" ON "modules"("code");

-- CreateIndex
CREATE INDEX "modules_code_idx" ON "modules"("code");

-- CreateIndex
CREATE INDEX "modules_is_active_idx" ON "modules"("is_active");

-- CreateIndex
CREATE INDEX "module_permissions_module_id_idx" ON "module_permissions"("module_id");

-- CreateIndex
CREATE INDEX "module_permissions_category_idx" ON "module_permissions"("category");

-- CreateIndex
CREATE UNIQUE INDEX "module_permissions_module_id_code_key" ON "module_permissions"("module_id", "code");

-- CreateIndex
CREATE INDEX "user_module_permissions_user_id_idx" ON "user_module_permissions"("user_id");

-- CreateIndex
CREATE INDEX "user_module_permissions_module_id_idx" ON "user_module_permissions"("module_id");

-- CreateIndex
CREATE INDEX "user_module_permissions_permission_id_idx" ON "user_module_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "user_module_permissions_expires_at_idx" ON "user_module_permissions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_module_permissions_user_id_permission_id_key" ON "user_module_permissions"("user_id", "permission_id");

-- CreateIndex
CREATE INDEX "module_notification_settings_module_id_idx" ON "module_notification_settings"("module_id");

-- CreateIndex
CREATE INDEX "module_notification_settings_is_enabled_idx" ON "module_notification_settings"("is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "module_notification_settings_module_id_event_key_key" ON "module_notification_settings"("module_id", "event_key");

-- CreateIndex
CREATE INDEX "module_approval_rules_module_id_idx" ON "module_approval_rules"("module_id");

-- CreateIndex
CREATE INDEX "module_approval_rules_is_enabled_idx" ON "module_approval_rules"("is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "module_approval_rules_module_id_rule_key_key" ON "module_approval_rules"("module_id", "rule_key");

-- AddForeignKey
ALTER TABLE "module_permissions" ADD CONSTRAINT "module_permissions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_module_permissions" ADD CONSTRAINT "user_module_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_module_permissions" ADD CONSTRAINT "user_module_permissions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_module_permissions" ADD CONSTRAINT "user_module_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "module_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_module_permissions" ADD CONSTRAINT "user_module_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_notification_settings" ADD CONSTRAINT "module_notification_settings_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_approval_rules" ADD CONSTRAINT "module_approval_rules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_approval_rules" ADD CONSTRAINT "module_approval_rules_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
