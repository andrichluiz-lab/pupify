-- AlterTable
ALTER TABLE "WhatsAppContact" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "internalNotes" TEXT;

-- CreateTable
CREATE TABLE "WhatsAppLabel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_WhatsAppContactToWhatsAppLabel" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "WhatsAppLabel_tenantId_idx" ON "WhatsAppLabel"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppLabel_tenantId_name_key" ON "WhatsAppLabel"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "_WhatsAppContactToWhatsAppLabel_AB_unique" ON "_WhatsAppContactToWhatsAppLabel"("A", "B");

-- CreateIndex
CREATE INDEX "_WhatsAppContactToWhatsAppLabel_B_index" ON "_WhatsAppContactToWhatsAppLabel"("B");

-- CreateIndex
CREATE INDEX "WhatsAppContact_archived_idx" ON "WhatsAppContact"("archived");

-- AddForeignKey
ALTER TABLE "WhatsAppLabel" ADD CONSTRAINT "WhatsAppLabel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WhatsAppContactToWhatsAppLabel" ADD CONSTRAINT "_WhatsAppContactToWhatsAppLabel_A_fkey" FOREIGN KEY ("A") REFERENCES "WhatsAppContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WhatsAppContactToWhatsAppLabel" ADD CONSTRAINT "_WhatsAppContactToWhatsAppLabel_B_fkey" FOREIGN KEY ("B") REFERENCES "WhatsAppLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
