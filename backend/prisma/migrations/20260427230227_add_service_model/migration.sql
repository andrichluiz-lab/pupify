-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "durationMin" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Service_tenantId_idx" ON "Service"("tenantId");

-- CreateIndex
CREATE INDEX "Service_category_idx" ON "Service"("category");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
