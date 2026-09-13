-- DropForeignKey
ALTER TABLE "ImageExam" DROP CONSTRAINT "ImageExam_veterinarianId_fkey";

-- AlterTable
ALTER TABLE "ImageExam" ALTER COLUMN "veterinarianId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ImageExam" ADD CONSTRAINT "ImageExam_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "Veterinarian"("id") ON DELETE SET NULL ON UPDATE CASCADE;
