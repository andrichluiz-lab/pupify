-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "File_tenantId_idx" ON "File"("tenantId");

-- CreateIndex
CREATE INDEX "File_entityType_entityId_idx" ON "File"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "File_key_idx" ON "File"("key");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
