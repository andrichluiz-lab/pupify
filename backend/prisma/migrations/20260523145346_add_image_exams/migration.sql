-- CreateEnum
CREATE TYPE "ImageExamType" AS ENUM ('radiografia', 'ultrassom', 'tomografia', 'ressonancia', 'laboratorio', 'outro');

-- CreateEnum
CREATE TYPE "ImageExamStatus" AS ENUM ('pendente', 'analisando', 'concluido', 'cancelado');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Permission" ADD VALUE 'image_exams_view';
ALTER TYPE "Permission" ADD VALUE 'image_exams_create';
ALTER TYPE "Permission" ADD VALUE 'image_exams_edit';
ALTER TYPE "Permission" ADD VALUE 'image_exams_delete';
ALTER TYPE "Permission" ADD VALUE 'image_exams_ai';

-- CreateTable
CREATE TABLE "ImageExam" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "veterinarianId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ImageExamType" NOT NULL,
    "status" "ImageExamStatus" NOT NULL DEFAULT 'pendente',
    "fileId" TEXT,
    "extractedText" TEXT,
    "aiAnalysis" JSONB,
    "aiReport" TEXT,
    "veterinarianNotes" TEXT,
    "pdvItems" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImageExam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImageExam_patientId_idx" ON "ImageExam"("patientId");

-- CreateIndex
CREATE INDEX "ImageExam_veterinarianId_idx" ON "ImageExam"("veterinarianId");

-- CreateIndex
CREATE INDEX "ImageExam_tenantId_idx" ON "ImageExam"("tenantId");

-- CreateIndex
CREATE INDEX "ImageExam_status_idx" ON "ImageExam"("status");

-- CreateIndex
CREATE INDEX "ImageExam_type_idx" ON "ImageExam"("type");

-- CreateIndex
CREATE INDEX "ImageExam_fileId_idx" ON "ImageExam"("fileId");

-- AddForeignKey
ALTER TABLE "ImageExam" ADD CONSTRAINT "ImageExam_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageExam" ADD CONSTRAINT "ImageExam_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "Veterinarian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageExam" ADD CONSTRAINT "ImageExam_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageExam" ADD CONSTRAINT "ImageExam_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
