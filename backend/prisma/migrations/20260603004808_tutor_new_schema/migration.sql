-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('pendente', 'aprovado', 'recusado', 'expirado');

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "patientId" TEXT,
    "tenantId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'pendente',
    "items" JSONB NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quote_tutorId_idx" ON "Quote"("tutorId");

-- CreateIndex
CREATE INDEX "Quote_patientId_idx" ON "Quote"("patientId");

-- CreateIndex
CREATE INDEX "Quote_tenantId_idx" ON "Quote"("tenantId");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
