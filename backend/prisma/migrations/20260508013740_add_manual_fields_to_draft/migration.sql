-- AlterTable
ALTER TABLE "ConsultationDraft" ADD COLUMN     "anamnesis" TEXT,
ADD COLUMN     "diagnosis" TEXT,
ADD COLUMN     "diagnosticPlan" TEXT,
ADD COLUMN     "mode" "ConsultationMode" NOT NULL DEFAULT 'manual',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "symptoms" JSONB,
ADD COLUMN     "treatmentPlan" TEXT;

-- CreateIndex
CREATE INDEX "ConsultationDraft_mode_idx" ON "ConsultationDraft"("mode");
