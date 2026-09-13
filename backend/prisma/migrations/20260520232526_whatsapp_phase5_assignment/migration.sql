-- AlterTable
ALTER TABLE "WhatsAppContact" ADD COLUMN     "assignedToId" TEXT;

-- CreateIndex
CREATE INDEX "WhatsAppContact_assignedToId_idx" ON "WhatsAppContact"("assignedToId");

-- AddForeignKey
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
