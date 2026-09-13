-- AlterTable
ALTER TABLE "FinancialTransaction" ADD COLUMN     "appointmentId" TEXT;

-- CreateIndex
CREATE INDEX "FinancialTransaction_appointmentId_idx" ON "FinancialTransaction"("appointmentId");

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
