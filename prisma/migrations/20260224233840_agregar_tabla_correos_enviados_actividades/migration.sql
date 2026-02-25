-- CreateTable
CREATE TABLE "act_emails_sent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requirement_id" UUID NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500),
    "sent_by_id" UUID NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "act_emails_sent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "act_emails_sent_requirement_id_idx" ON "act_emails_sent"("requirement_id");

-- CreateIndex
CREATE INDEX "act_emails_sent_sent_by_id_idx" ON "act_emails_sent"("sent_by_id");

-- AddForeignKey
ALTER TABLE "act_emails_sent" ADD CONSTRAINT "act_emails_sent_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "act_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_emails_sent" ADD CONSTRAINT "act_emails_sent_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
