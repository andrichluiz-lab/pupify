/*
  Warnings:

  - You are about to drop the column `appointmentId` on the `FinancialTransaction` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "FinancialTransaction" DROP CONSTRAINT "FinancialTransaction_appointmentId_fkey";

-- DropIndex
DROP INDEX "FinancialTransaction_appointmentId_idx";

-- AlterTable
ALTER TABLE "FinancialTransaction" DROP COLUMN "appointmentId";
