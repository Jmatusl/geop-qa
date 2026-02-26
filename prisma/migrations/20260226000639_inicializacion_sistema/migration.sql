-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "email_verified_at" TIMESTAMPTZ(6),
    "password_hash" VARCHAR(255),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "rut" VARCHAR(12),
    "phone" VARCHAR(20),
    "experience_years" INTEGER,
    "avatar_url" TEXT,
    "avatarFile" TEXT,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deactivated" BOOLEAN NOT NULL DEFAULT false,
    "deactivation_reason_id" UUID,
    "deactivation_comment" TEXT,
    "deactivated_at" TIMESTAMPTZ(6),
    "deactivated_by" UUID,
    "last_login_at" TIMESTAMPTZ(6),
    "last_login_ip" TEXT,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "person_id" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "provider_subject" VARCHAR(255) NOT NULL,
    "provider_email" VARCHAR(255) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "linked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "last_activity_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activation_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(100) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(50),
    "path" VARCHAR(255),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "show_icon" BOOLEAN NOT NULL DEFAULT true,
    "parent_id" UUID,
    "roles" VARCHAR(50)[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_audit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "previous_json" JSONB NOT NULL,
    "new_json" JSONB NOT NULL,
    "changed_by" UUID NOT NULL,
    "change_reason" TEXT,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "event_type" VARCHAR(50) NOT NULL,
    "module" VARCHAR(50),
    "page_url" TEXT,
    "endpoint" TEXT,
    "http_method" VARCHAR(10),
    "status_code" INTEGER,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_deactivation_reasons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_deactivation_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "has_custom_ui" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings_audit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "setting_key" VARCHAR(100) NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "changed_by" UUID,
    "change_reason" TEXT,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_settings_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "work_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "job_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rut" VARCHAR(12) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "mother_last_name" VARCHAR(100),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "address" VARCHAR(255),
    "image_path" VARCHAR(255),
    "nationality" VARCHAR(50),
    "birth_date" DATE,
    "civil_status" VARCHAR(20),
    "shoe_size" VARCHAR(10),
    "shirt_size" VARCHAR(10),
    "pants_size" VARCHAR(10),
    "emergency_contact_name" VARCHAR(100),
    "emergency_contact_phone" VARCHAR(20),
    "bank_name" VARCHAR(50),
    "account_type" VARCHAR(20),
    "account_number" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_work_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "person_id" UUID NOT NULL,
    "work_group_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID,

    CONSTRAINT "person_work_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "person_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID,

    CONSTRAINT "person_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_job_positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "person_id" UUID NOT NULL,
    "job_position_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "person_job_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_supervisors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "person_id" UUID NOT NULL,
    "supervisor_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "person_supervisors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "html_content" TEXT NOT NULL,
    "description" TEXT,
    "variables" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_farming_centers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "siep_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "responsible_name" VARCHAR(100),
    "commune" VARCHAR(100),
    "region" VARCHAR(100),
    "production_area_id" UUID,
    "owner_company" VARCHAR(100),
    "production_cycle" VARCHAR(50),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_farming_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_production_areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_production_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_installations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "folio" VARCHAR(50),
    "internal_code" VARCHAR(50),
    "installation_type" VARCHAR(50),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "farming_center_id" UUID,
    "description" TEXT,
    "observations" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "signature_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_systems" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "area_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_equipments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "brand" VARCHAR(100),
    "model" VARCHAR(100),
    "part_number" VARCHAR(100),
    "serial_number" VARCHAR(100),
    "area_id" UUID NOT NULL,
    "system_id" UUID NOT NULL,
    "technical_comments" TEXT,
    "prev_instructions" TEXT,
    "estimated_life" VARCHAR(50),
    "commissioning_date" DATE,
    "image_url" VARCHAR(255),
    "image_description" VARCHAR(200),
    "datasheet_url" VARCHAR(255),
    "datasheet_name" VARCHAR(200),
    "reference_price" DECIMAL(10,2),
    "installation_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_equipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_applicants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255),
    "job_position_id" UUID,
    "signature_url" VARCHAR(255),
    "user_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_applicants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_technical_responsibles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "area_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_technical_responsibles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_equipment_responsibles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "responsible_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mnt_equipment_responsibles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_suppliers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rut" VARCHAR(12) NOT NULL,
    "business_line" VARCHAR(150) NOT NULL,
    "legal_name" VARCHAR(150),
    "fantasy_name" VARCHAR(150),
    "contact_name" VARCHAR(150),
    "phone" VARCHAR(20),
    "contact_email" VARCHAR(255),
    "activity_emails" JSONB,
    "address" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_job_positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_job_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_activity_locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "commune" VARCHAR(100),
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_activity_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_request_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_request_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_request_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "color_hex" VARCHAR(7),
    "css_class" VARCHAR(50),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_request_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_supply_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_supply_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_supply_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "color_hex" VARCHAR(7),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_supply_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "folio" SERIAL NOT NULL,
    "folio_prefix" VARCHAR(10) NOT NULL DEFAULT 'RD',
    "installation_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "type_id" UUID NOT NULL,
    "status_id" UUID NOT NULL,
    "applicant_id" UUID,
    "description" TEXT NOT NULL,
    "tercerized_reason" TEXT,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMPTZ(6),
    "approved_by" UUID,
    "estimated_end_date" DATE,
    "actual_end_date" DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_request_evidences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "public_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" VARCHAR(50),
    "captured_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mnt_request_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_request_timeline" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "changed_by" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "prev_status_id" UUID,
    "new_status_id" UUID,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mnt_request_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_user_notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "on_new_request" BOOLEAN NOT NULL DEFAULT true,
    "on_approval" BOOLEAN NOT NULL DEFAULT true,
    "on_reprogram" BOOLEAN NOT NULL DEFAULT true,
    "on_close" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_user_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_request_iterations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "technician_name" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "mnt_request_iterations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_request_expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mnt_request_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_work_requirements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "folio" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "provider_id" UUID NOT NULL,
    "status_id" UUID NOT NULL,
    "oc_number" VARCHAR(50),
    "oc_value" DOUBLE PRECISION,
    "invoice_number" VARCHAR(50),
    "invoice_value" DOUBLE PRECISION,
    "requisition_number" VARCHAR(50),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_work_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_work_requirement_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "color_hex" VARCHAR(7),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mnt_work_requirement_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_work_requirement_relations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "work_requirement_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,

    CONSTRAINT "mnt_work_requirement_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_work_requirement_evidences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "work_requirement_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "public_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" VARCHAR(50),
    "captured_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mnt_work_requirement_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signatures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "data" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "user_id" UUID,

    CONSTRAINT "signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_activity_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "act_activity_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_priorities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "color_hex" VARCHAR(7) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "act_priorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_status_reqs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "color_hex" VARCHAR(7),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "act_status_reqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_requirements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "folio" SERIAL NOT NULL,
    "folio_prefix" VARCHAR(10) NOT NULL DEFAULT 'REQ',
    "title" VARCHAR(200),
    "master_activity_name_id" UUID,
    "master_activity_name_text" TEXT,
    "description" TEXT NOT NULL,
    "observations" TEXT,
    "activity_type_id" UUID NOT NULL,
    "priority_id" UUID NOT NULL,
    "status_id" UUID NOT NULL,
    "location_id" UUID,
    "area_id" UUID,
    "applicant_user_id" UUID,
    "nombre_solicitante" VARCHAR(150),
    "responsible_user_id" UUID,
    "estimated_date" DATE,
    "estimated_time" VARCHAR(10),
    "estimated_value" DECIMAL(15,2) DEFAULT 0,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMPTZ(6),
    "approved_by" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "user_check_requerido" BOOLEAN NOT NULL DEFAULT false,
    "user_check_observaciones" TEXT,
    "user_check_requerido_aprobado" BOOLEAN NOT NULL DEFAULT false,
    "user_checked_by" UUID,
    "user_checked_at" TIMESTAMPTZ(6),
    "ship_id" UUID,

    CONSTRAINT "act_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_emails_sent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requirement_id" UUID NOT NULL,
    "requirement_folio" VARCHAR(50),
    "provider_name" VARCHAR(255),
    "recipient" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500),
    "sent_by_id" UUID NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "act_emails_sent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_master_activity_names" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "default_location_id" UUID,
    "default_area_id" UUID,
    "default_applicant_user_id" UUID,
    "default_description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "act_master_activity_names_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requirement_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "activity_type_id" UUID,
    "description" TEXT,
    "location" VARCHAR(200),
    "location_id" UUID,
    "start_date" DATE,
    "end_date" DATE,
    "status_activity" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "status_id" UUID,
    "estimated_value" DECIMAL(15,2) DEFAULT 0,
    "registered_time" INTEGER,
    "responsible_user_id" UUID,
    "supplier_id" UUID,
    "observations" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked_at" TIMESTAMPTZ(6),
    "checked_by" UUID,
    "is_checked" BOOLEAN NOT NULL DEFAULT false,
    "userId" UUID,

    CONSTRAINT "act_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_status_acts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "color_hex" VARCHAR(7),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "act_status_acts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requirement_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "act_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requirement_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "public_url" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "act_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_activity_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activity_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "public_url" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "act_activity_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_activity_receptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activity_id" UUID NOT NULL,
    "is_accepted" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "received_by_id" UUID NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "act_activity_receptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_reception_evidences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reception_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "public_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" VARCHAR(50),
    "captured_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "act_reception_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_timeline" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requirement_id" UUID NOT NULL,
    "changed_by" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "prev_status_id" UUID,
    "new_status_id" UUID,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "act_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
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
    "required_permissions" TEXT[],
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

-- CreateTable
CREATE TABLE "user_notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "module_code" VARCHAR(50) NOT NULL,
    "event_key" VARCHAR(100) NOT NULL,
    "is_opted_out" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ApplicantInstallations" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_rut_key" ON "users"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "users_person_id_key" ON "users"("person_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_rut_idx" ON "users"("rut");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "users_is_deactivated_idx" ON "users"("is_deactivated");

-- CreateIndex
CREATE INDEX "users_person_id_idx" ON "users"("person_id");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE INDEX "user_identities_user_id_idx" ON "user_identities"("user_id");

-- CreateIndex
CREATE INDEX "user_identities_provider_email_idx" ON "user_identities"("provider_email");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_provider_provider_subject_key" ON "user_identities"("provider", "provider_subject");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "activation_tokens_token_key" ON "activation_tokens"("token");

-- CreateIndex
CREATE INDEX "activation_tokens_token_idx" ON "activation_tokens"("token");

-- CreateIndex
CREATE INDEX "activation_tokens_user_id_idx" ON "activation_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_items_key_key" ON "menu_items"("key");

-- CreateIndex
CREATE INDEX "menu_items_key_idx" ON "menu_items"("key");

-- CreateIndex
CREATE INDEX "menu_items_parent_id_idx" ON "menu_items"("parent_id");

-- CreateIndex
CREATE INDEX "menu_items_enabled_idx" ON "menu_items"("enabled");

-- CreateIndex
CREATE INDEX "menu_items_order_idx" ON "menu_items"("order");

-- CreateIndex
CREATE INDEX "menu_audit_changed_at_idx" ON "menu_audit"("changed_at" DESC);

-- CreateIndex
CREATE INDEX "access_logs_user_id_idx" ON "access_logs"("user_id");

-- CreateIndex
CREATE INDEX "access_logs_event_type_idx" ON "access_logs"("event_type");

-- CreateIndex
CREATE INDEX "access_logs_created_at_idx" ON "access_logs"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_deactivation_reasons_code_key" ON "user_deactivation_reasons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings"("key");

-- CreateIndex
CREATE INDEX "app_settings_key_idx" ON "app_settings"("key");

-- CreateIndex
CREATE INDEX "app_settings_audit_setting_key_idx" ON "app_settings_audit"("setting_key");

-- CreateIndex
CREATE INDEX "app_settings_audit_changed_at_idx" ON "app_settings_audit"("changed_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "work_groups_code_key" ON "work_groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "areas_code_key" ON "areas"("code");

-- CreateIndex
CREATE UNIQUE INDEX "job_positions_code_key" ON "job_positions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "persons_rut_key" ON "persons"("rut");

-- CreateIndex
CREATE INDEX "person_work_groups_person_id_idx" ON "person_work_groups"("person_id");

-- CreateIndex
CREATE INDEX "person_work_groups_work_group_id_idx" ON "person_work_groups"("work_group_id");

-- CreateIndex
CREATE INDEX "person_areas_person_id_idx" ON "person_areas"("person_id");

-- CreateIndex
CREATE INDEX "person_areas_area_id_idx" ON "person_areas"("area_id");

-- CreateIndex
CREATE INDEX "person_job_positions_person_id_idx" ON "person_job_positions"("person_id");

-- CreateIndex
CREATE INDEX "person_job_positions_job_position_id_idx" ON "person_job_positions"("job_position_id");

-- CreateIndex
CREATE INDEX "person_supervisors_person_id_idx" ON "person_supervisors"("person_id");

-- CreateIndex
CREATE INDEX "person_supervisors_supervisor_id_idx" ON "person_supervisors"("supervisor_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_code_key" ON "email_templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "mnt_farming_centers_siep_code_key" ON "mnt_farming_centers"("siep_code");

-- CreateIndex
CREATE UNIQUE INDEX "mnt_production_areas_name_key" ON "mnt_production_areas"("name");

-- CreateIndex
CREATE INDEX "mnt_systems_area_id_idx" ON "mnt_systems"("area_id");

-- CreateIndex
CREATE INDEX "mnt_equipments_system_id_idx" ON "mnt_equipments"("system_id");

-- CreateIndex
CREATE INDEX "mnt_equipments_area_id_idx" ON "mnt_equipments"("area_id");

-- CreateIndex
CREATE INDEX "mnt_equipments_installation_id_idx" ON "mnt_equipments"("installation_id");

-- CreateIndex
CREATE UNIQUE INDEX "mnt_applicants_user_id_key" ON "mnt_applicants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "mnt_technical_responsibles_user_id_key" ON "mnt_technical_responsibles"("user_id");

-- CreateIndex
CREATE INDEX "mnt_technical_responsibles_area_id_idx" ON "mnt_technical_responsibles"("area_id");

-- CreateIndex
CREATE UNIQUE INDEX "mnt_equipment_responsibles_equipment_id_responsible_id_key" ON "mnt_equipment_responsibles"("equipment_id", "responsible_id");

-- CreateIndex
CREATE UNIQUE INDEX "mnt_suppliers_rut_key" ON "mnt_suppliers"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "mnt_request_types_name_key" ON "mnt_request_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "mnt_request_statuses_name_key" ON "mnt_request_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "mnt_supply_categories_name_key" ON "mnt_supply_categories"("name");

-- CreateIndex
CREATE INDEX "mnt_supply_items_category_id_idx" ON "mnt_supply_items"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "mnt_requests_folio_key" ON "mnt_requests"("folio");

-- CreateIndex
CREATE INDEX "mnt_requests_installation_id_idx" ON "mnt_requests"("installation_id");

-- CreateIndex
CREATE INDEX "mnt_requests_equipment_id_idx" ON "mnt_requests"("equipment_id");

-- CreateIndex
CREATE INDEX "mnt_requests_status_id_idx" ON "mnt_requests"("status_id");

-- CreateIndex
CREATE INDEX "mnt_request_evidences_request_id_idx" ON "mnt_request_evidences"("request_id");

-- CreateIndex
CREATE INDEX "mnt_request_timeline_request_id_idx" ON "mnt_request_timeline"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "mnt_user_notification_preferences_user_id_key" ON "mnt_user_notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "mnt_work_requirements_folio_key" ON "mnt_work_requirements"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "mnt_work_requirement_statuses_name_key" ON "mnt_work_requirement_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "mnt_work_requirement_relations_work_requirement_id_request__key" ON "mnt_work_requirement_relations"("work_requirement_id", "request_id");

-- CreateIndex
CREATE INDEX "mnt_work_requirement_evidences_work_requirement_id_idx" ON "mnt_work_requirement_evidences"("work_requirement_id");

-- CreateIndex
CREATE UNIQUE INDEX "act_activity_types_name_key" ON "act_activity_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "act_activity_types_code_key" ON "act_activity_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "act_priorities_name_key" ON "act_priorities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "act_priorities_code_key" ON "act_priorities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "act_status_reqs_name_key" ON "act_status_reqs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "act_status_reqs_code_key" ON "act_status_reqs"("code");

-- CreateIndex
CREATE UNIQUE INDEX "act_requirements_folio_key" ON "act_requirements"("folio");

-- CreateIndex
CREATE INDEX "act_requirements_status_id_idx" ON "act_requirements"("status_id");

-- CreateIndex
CREATE INDEX "act_requirements_priority_id_idx" ON "act_requirements"("priority_id");

-- CreateIndex
CREATE INDEX "act_requirements_activity_type_id_idx" ON "act_requirements"("activity_type_id");

-- CreateIndex
CREATE INDEX "act_requirements_applicant_user_id_idx" ON "act_requirements"("applicant_user_id");

-- CreateIndex
CREATE INDEX "act_requirements_responsible_user_id_idx" ON "act_requirements"("responsible_user_id");

-- CreateIndex
CREATE INDEX "act_requirements_area_id_idx" ON "act_requirements"("area_id");

-- CreateIndex
CREATE INDEX "act_emails_sent_requirement_id_idx" ON "act_emails_sent"("requirement_id");

-- CreateIndex
CREATE INDEX "act_emails_sent_sent_by_id_idx" ON "act_emails_sent"("sent_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "act_master_activity_names_name_key" ON "act_master_activity_names"("name");

-- CreateIndex
CREATE INDEX "act_activities_requirement_id_idx" ON "act_activities"("requirement_id");

-- CreateIndex
CREATE INDEX "act_activities_location_id_idx" ON "act_activities"("location_id");

-- CreateIndex
CREATE INDEX "act_activities_status_id_idx" ON "act_activities"("status_id");

-- CreateIndex
CREATE UNIQUE INDEX "act_status_acts_name_key" ON "act_status_acts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "act_status_acts_code_key" ON "act_status_acts"("code");

-- CreateIndex
CREATE INDEX "act_comments_requirement_id_idx" ON "act_comments"("requirement_id");

-- CreateIndex
CREATE INDEX "act_attachments_requirement_id_idx" ON "act_attachments"("requirement_id");

-- CreateIndex
CREATE INDEX "act_activity_attachments_activity_id_idx" ON "act_activity_attachments"("activity_id");

-- CreateIndex
CREATE INDEX "act_activity_receptions_activity_id_idx" ON "act_activity_receptions"("activity_id");

-- CreateIndex
CREATE INDEX "act_activity_receptions_received_by_id_idx" ON "act_activity_receptions"("received_by_id");

-- CreateIndex
CREATE INDEX "act_reception_evidences_reception_id_idx" ON "act_reception_evidences"("reception_id");

-- CreateIndex
CREATE INDEX "act_timeline_requirement_id_idx" ON "act_timeline"("requirement_id");

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

-- CreateIndex
CREATE INDEX "user_notification_preferences_user_id_idx" ON "user_notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_preferences_user_id_module_code_event_key_key" ON "user_notification_preferences"("user_id", "module_code", "event_key");

-- CreateIndex
CREATE UNIQUE INDEX "_ApplicantInstallations_AB_unique" ON "_ApplicantInstallations"("A", "B");

-- CreateIndex
CREATE INDEX "_ApplicantInstallations_B_index" ON "_ApplicantInstallations"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_deactivated_by_fkey" FOREIGN KEY ("deactivated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_deactivation_reason_id_fkey" FOREIGN KEY ("deactivation_reason_id") REFERENCES "user_deactivation_reasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activation_tokens" ADD CONSTRAINT "activation_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_audit" ADD CONSTRAINT "menu_audit_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_settings_audit" ADD CONSTRAINT "app_settings_audit_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_work_groups" ADD CONSTRAINT "person_work_groups_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_work_groups" ADD CONSTRAINT "person_work_groups_work_group_id_fkey" FOREIGN KEY ("work_group_id") REFERENCES "work_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_areas" ADD CONSTRAINT "person_areas_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_areas" ADD CONSTRAINT "person_areas_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_job_positions" ADD CONSTRAINT "person_job_positions_job_position_id_fkey" FOREIGN KEY ("job_position_id") REFERENCES "job_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_job_positions" ADD CONSTRAINT "person_job_positions_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_supervisors" ADD CONSTRAINT "person_supervisors_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_supervisors" ADD CONSTRAINT "person_supervisors_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_farming_centers" ADD CONSTRAINT "mnt_farming_centers_production_area_id_fkey" FOREIGN KEY ("production_area_id") REFERENCES "mnt_production_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_installations" ADD CONSTRAINT "mnt_installations_farming_center_id_fkey" FOREIGN KEY ("farming_center_id") REFERENCES "mnt_farming_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_systems" ADD CONSTRAINT "mnt_systems_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "mnt_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_equipments" ADD CONSTRAINT "mnt_equipments_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "mnt_installations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_equipments" ADD CONSTRAINT "mnt_equipments_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "mnt_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_applicants" ADD CONSTRAINT "mnt_applicants_job_position_id_fkey" FOREIGN KEY ("job_position_id") REFERENCES "mnt_job_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_applicants" ADD CONSTRAINT "mnt_applicants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_technical_responsibles" ADD CONSTRAINT "mnt_technical_responsibles_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "mnt_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_technical_responsibles" ADD CONSTRAINT "mnt_technical_responsibles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_equipment_responsibles" ADD CONSTRAINT "mnt_equipment_responsibles_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "mnt_equipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_equipment_responsibles" ADD CONSTRAINT "mnt_equipment_responsibles_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "mnt_technical_responsibles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_supply_items" ADD CONSTRAINT "mnt_supply_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "mnt_supply_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_requests" ADD CONSTRAINT "mnt_requests_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "mnt_applicants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_requests" ADD CONSTRAINT "mnt_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_requests" ADD CONSTRAINT "mnt_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_requests" ADD CONSTRAINT "mnt_requests_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "mnt_equipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_requests" ADD CONSTRAINT "mnt_requests_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "mnt_installations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_requests" ADD CONSTRAINT "mnt_requests_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "mnt_request_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_requests" ADD CONSTRAINT "mnt_requests_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "mnt_request_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_request_evidences" ADD CONSTRAINT "mnt_request_evidences_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "mnt_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_request_timeline" ADD CONSTRAINT "mnt_request_timeline_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_request_timeline" ADD CONSTRAINT "mnt_request_timeline_new_status_id_fkey" FOREIGN KEY ("new_status_id") REFERENCES "mnt_request_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_request_timeline" ADD CONSTRAINT "mnt_request_timeline_prev_status_id_fkey" FOREIGN KEY ("prev_status_id") REFERENCES "mnt_request_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_request_timeline" ADD CONSTRAINT "mnt_request_timeline_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "mnt_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_user_notification_preferences" ADD CONSTRAINT "mnt_user_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_request_iterations" ADD CONSTRAINT "mnt_request_iterations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_request_iterations" ADD CONSTRAINT "mnt_request_iterations_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "mnt_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_request_expenses" ADD CONSTRAINT "mnt_request_expenses_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "mnt_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_work_requirements" ADD CONSTRAINT "mnt_work_requirements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_work_requirements" ADD CONSTRAINT "mnt_work_requirements_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "mnt_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_work_requirements" ADD CONSTRAINT "mnt_work_requirements_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "mnt_work_requirement_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_work_requirement_relations" ADD CONSTRAINT "mnt_work_requirement_relations_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "mnt_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_work_requirement_relations" ADD CONSTRAINT "mnt_work_requirement_relations_work_requirement_id_fkey" FOREIGN KEY ("work_requirement_id") REFERENCES "mnt_work_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_work_requirement_evidences" ADD CONSTRAINT "mnt_work_requirement_evidences_work_requirement_id_fkey" FOREIGN KEY ("work_requirement_id") REFERENCES "mnt_work_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "act_activity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_applicant_user_id_fkey" FOREIGN KEY ("applicant_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "mnt_activity_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "mnt_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_priority_id_fkey" FOREIGN KEY ("priority_id") REFERENCES "act_priorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_user_checked_by_fkey" FOREIGN KEY ("user_checked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_ship_id_fkey" FOREIGN KEY ("ship_id") REFERENCES "mnt_installations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "act_status_reqs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_requirements" ADD CONSTRAINT "act_requirements_master_activity_name_id_fkey" FOREIGN KEY ("master_activity_name_id") REFERENCES "act_master_activity_names"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_emails_sent" ADD CONSTRAINT "act_emails_sent_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "act_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_emails_sent" ADD CONSTRAINT "act_emails_sent_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_master_activity_names" ADD CONSTRAINT "act_master_activity_names_default_area_id_fkey" FOREIGN KEY ("default_area_id") REFERENCES "mnt_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_master_activity_names" ADD CONSTRAINT "act_master_activity_names_default_applicant_user_id_fkey" FOREIGN KEY ("default_applicant_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activities" ADD CONSTRAINT "act_activities_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "act_activity_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activities" ADD CONSTRAINT "act_activities_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activities" ADD CONSTRAINT "act_activities_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "act_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activities" ADD CONSTRAINT "act_activities_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activities" ADD CONSTRAINT "act_activities_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "mnt_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activities" ADD CONSTRAINT "act_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activities" ADD CONSTRAINT "act_activities_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "mnt_activity_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activities" ADD CONSTRAINT "act_activities_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "act_status_acts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_comments" ADD CONSTRAINT "act_comments_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "act_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_comments" ADD CONSTRAINT "act_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_attachments" ADD CONSTRAINT "act_attachments_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "act_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_attachments" ADD CONSTRAINT "act_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activity_attachments" ADD CONSTRAINT "act_activity_attachments_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "act_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activity_attachments" ADD CONSTRAINT "act_activity_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activity_receptions" ADD CONSTRAINT "act_activity_receptions_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "act_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_activity_receptions" ADD CONSTRAINT "act_activity_receptions_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_reception_evidences" ADD CONSTRAINT "act_reception_evidences_reception_id_fkey" FOREIGN KEY ("reception_id") REFERENCES "act_activity_receptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_timeline" ADD CONSTRAINT "act_timeline_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_timeline" ADD CONSTRAINT "act_timeline_new_status_id_fkey" FOREIGN KEY ("new_status_id") REFERENCES "act_status_reqs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_timeline" ADD CONSTRAINT "act_timeline_prev_status_id_fkey" FOREIGN KEY ("prev_status_id") REFERENCES "act_status_reqs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_timeline" ADD CONSTRAINT "act_timeline_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "act_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApplicantInstallations" ADD CONSTRAINT "_ApplicantInstallations_A_fkey" FOREIGN KEY ("A") REFERENCES "mnt_applicants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApplicantInstallations" ADD CONSTRAINT "_ApplicantInstallations_B_fkey" FOREIGN KEY ("B") REFERENCES "mnt_installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
