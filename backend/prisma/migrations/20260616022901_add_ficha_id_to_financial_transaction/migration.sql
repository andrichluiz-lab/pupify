-- AlterTable
ALTER TABLE "FinancialTransaction" ADD COLUMN     "fichaId" TEXT;

-- CreateIndex
CREATE INDEX "FinancialTransaction_fichaId_idx" ON "FinancialTransaction"("fichaId");

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_fichaId_fkey" FOREIGN KEY ("fichaId") REFERENCES "Ficha"("id") ON DELETE SET NULL ON UPDATE CASCADE;
