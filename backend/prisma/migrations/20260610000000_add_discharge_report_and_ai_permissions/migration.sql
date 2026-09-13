-- AlterTable: add dischargeReport to Hospitalization
ALTER TABLE "Hospitalization" ADD COLUMN "dischargeReport" TEXT;

-- AlterEnum: add hospitalizations_ai and surgeries_ai to Permission
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'hospitalizations_ai';
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'surgeries_ai';
