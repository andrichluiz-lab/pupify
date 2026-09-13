-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('appointment_confirmation', 'appointment_reminder', 'password_reset', 'hospitalization_update', 'financial_report', 'surgery_reminder', 'custom');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "EmailType" NOT NULL,
    "variables" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailTemplate_tenantId_idx" ON "EmailTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "EmailTemplate_type_idx" ON "EmailTemplate"("type");

-- CreateIndex
CREATE INDEX "EmailTemplate_active_idx" ON "EmailTemplate"("active");

-- CreateIndex
CREATE INDEX "EmailLog_tenantId_idx" ON "EmailLog"("tenantId");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_sentAt_idx" ON "EmailLog"("sentAt");

-- CreateIndex
CREATE INDEX "EmailLog_templateId_idx" ON "EmailLog"("templateId");

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
