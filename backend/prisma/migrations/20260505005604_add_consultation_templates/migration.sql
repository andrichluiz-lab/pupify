-- CreateEnum
CREATE TYPE "ConsultationMode" AS ENUM ('ai', 'manual');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('receita', 'exame', 'termo', 'atestado', 'declaracao', 'prontuario_modelo');

-- AlterTable
ALTER TABLE "MedicalRecord" ADD COLUMN     "anamnesis" TEXT,
ADD COLUMN     "diagnosis" TEXT,
ADD COLUMN     "diagnosticPlan" TEXT,
ADD COLUMN     "differentialDiagnosis" TEXT,
ADD COLUMN     "mode" "ConsultationMode" NOT NULL DEFAULT 'manual',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "symptoms" JSONB,
ADD COLUMN     "treatmentPlan" TEXT;

-- CreateTable
CREATE TABLE "ConsultationDocument" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "templateId" TEXT,
    "type" "TemplateType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "printedAt" TIMESTAMP(3),
    "sharedVia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultationDocument_consultationId_idx" ON "ConsultationDocument"("consultationId");

-- CreateIndex
CREATE INDEX "ConsultationDocument_type_idx" ON "ConsultationDocument"("type");

-- CreateIndex
CREATE INDEX "DocumentTemplate_tenantId_idx" ON "DocumentTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "DocumentTemplate_type_idx" ON "DocumentTemplate"("type");

-- CreateIndex
CREATE INDEX "MedicalRecord_mode_idx" ON "MedicalRecord"("mode");

-- AddForeignKey
ALTER TABLE "ConsultationDocument" ADD CONSTRAINT "ConsultationDocument_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "MedicalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
