-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "whatsappReminderSentAt" TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "Appointment_whatsappReminderSentAt_idx" ON "Appointment"("whatsappReminderSentAt");
