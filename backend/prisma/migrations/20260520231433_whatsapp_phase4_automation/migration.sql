-- AlterTable
ALTER TABLE "WhatsAppInstance" ADD COLUMN     "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoReplyGreeting" TEXT,
ADD COLUMN     "autoReplyOutOfHours" TEXT;

-- CreateTable
CREATE TABLE "WhatsAppQuickReply" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shortcut" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppQuickReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAutoResponse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppAutoResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppQuickReply_tenantId_idx" ON "WhatsAppQuickReply"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppQuickReply_tenantId_shortcut_key" ON "WhatsAppQuickReply"("tenantId", "shortcut");

-- CreateIndex
CREATE INDEX "WhatsAppAutoResponse_tenantId_idx" ON "WhatsAppAutoResponse"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppAutoResponse_tenantId_active_idx" ON "WhatsAppAutoResponse"("tenantId", "active");

-- AddForeignKey
ALTER TABLE "WhatsAppQuickReply" ADD CONSTRAINT "WhatsAppQuickReply_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAutoResponse" ADD CONSTRAINT "WhatsAppAutoResponse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
