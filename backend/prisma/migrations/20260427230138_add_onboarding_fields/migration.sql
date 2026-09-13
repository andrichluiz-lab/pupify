-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 0;
