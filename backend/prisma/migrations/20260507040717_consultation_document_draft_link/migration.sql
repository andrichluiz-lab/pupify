/*
  Warnings:

  - You are about to drop the column `consultationId` on the `ConsultationDocument` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ConsultationDocument" DROP CONSTRAINT "ConsultationDocument_consultationId_fkey";

-- DropIndex
DROP INDEX "ConsultationDocument_consultationId_idx";

-- AlterTable
ALTER TABLE "ConsultationDocument" DROP COLUMN "consultationId",
ADD COLUMN     "draftId" TEXT,
ADD COLUMN     "medicalRecordId" TEXT;

-- CreateIndex
CREATE INDEX "ConsultationDocument_medicalRecordId_idx" ON "ConsultationDocument"("medicalRecordId");

-- CreateIndex
CREATE INDEX "ConsultationDocument_draftId_idx" ON "ConsultationDocument"("draftId");

-- AddForeignKey
ALTER TABLE "ConsultationDocument" ADD CONSTRAINT "ConsultationDocument_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationDocument" ADD CONSTRAINT "ConsultationDocument_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ConsultationDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
