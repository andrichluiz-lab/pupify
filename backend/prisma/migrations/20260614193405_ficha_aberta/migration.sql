-- CreateEnum
CREATE TYPE "FichaStatus" AS ENUM ('aberto', 'aguardando_cobranca', 'fechado');

-- CreateTable
CREATE TABLE "Ficha" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tutorId" TEXT,
    "status" "FichaStatus" NOT NULL DEFAULT 'aberto',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openedById" TEXT,
    "closedById" TEXT,
    "notes" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "transactionId" TEXT,

    CONSTRAINT "Ficha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FichaItem" (
    "id" TEXT NOT NULL,
    "fichaId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "addedById" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FichaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ficha_transactionId_key" ON "Ficha"("transactionId");

-- CreateIndex
CREATE INDEX "Ficha_tenantId_status_idx" ON "Ficha"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Ficha_tenantId_patientId_idx" ON "Ficha"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "FichaItem_fichaId_idx" ON "FichaItem"("fichaId");

-- AddForeignKey
ALTER TABLE "Ficha" ADD CONSTRAINT "Ficha_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ficha" ADD CONSTRAINT "Ficha_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ficha" ADD CONSTRAINT "Ficha_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FichaItem" ADD CONSTRAINT "FichaItem_fichaId_fkey" FOREIGN KEY ("fichaId") REFERENCES "Ficha"("id") ON DELETE CASCADE ON UPDATE CASCADE;
