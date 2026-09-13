-- CreateEnum
CREATE TYPE "WhatsAppStatus" AS ENUM ('disconnected', 'connecting', 'connected');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Permission" ADD VALUE 'whatsapp_view';
ALTER TYPE "Permission" ADD VALUE 'whatsapp_send';
ALTER TYPE "Permission" ADD VALUE 'whatsapp_manage';

-- CreateTable
CREATE TABLE "WhatsAppInstance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "status" "WhatsAppStatus" NOT NULL DEFAULT 'disconnected',
    "phoneNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppContact" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "profilePic" TEXT,
    "patientId" TEXT,
    "tutorId" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fromMe" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "mediaUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppInstance_tenantId_key" ON "WhatsAppInstance"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppInstance_instanceName_key" ON "WhatsAppInstance"("instanceName");

-- CreateIndex
CREATE INDEX "WhatsAppContact_tenantId_idx" ON "WhatsAppContact"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppContact_tutorId_idx" ON "WhatsAppContact"("tutorId");

-- CreateIndex
CREATE INDEX "WhatsAppContact_lastMessageAt_idx" ON "WhatsAppContact"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppContact_instanceId_jid_key" ON "WhatsAppContact"("instanceId", "jid");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_contactId_idx" ON "WhatsAppMessage"("contactId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_tenantId_idx" ON "WhatsAppMessage"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_timestamp_idx" ON "WhatsAppMessage"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_instanceId_messageId_key" ON "WhatsAppMessage"("instanceId", "messageId");

-- AddForeignKey
ALTER TABLE "WhatsAppInstance" ADD CONSTRAINT "WhatsAppInstance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WhatsAppInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WhatsAppInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WhatsAppContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
