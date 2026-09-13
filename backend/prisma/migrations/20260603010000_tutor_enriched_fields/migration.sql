-- AlterTable: add enriched client fields to Tutor
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "tenantId"              TEXT;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "personType"            TEXT;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "rg"                    TEXT;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "nationality"           TEXT;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "sex"                   TEXT;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "birthDate"             TIMESTAMP(3);
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "howFound"              TEXT;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "profession"            TEXT;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "municipalRegistration" TEXT;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "cep"                   TEXT;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "addressStreet"         TEXT;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "addressNumber"         TEXT;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "addressComplement"     TEXT;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "addressNeighborhood"   TEXT;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "addressCity"           TEXT;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "addressState"          TEXT;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "addressReference"      TEXT;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "contacts"              JSONB;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "notes"                 TEXT;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "tags"                  TEXT[];
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "acceptEmail"           BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "acceptSms"             BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "acceptCampaignSms"     BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "acceptWhatsapp"        BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Tutor_tenantId_idx" ON "Tutor"("tenantId");

-- AddForeignKey (only if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Tutor_tenantId_fkey'
  ) THEN
    ALTER TABLE "Tutor"
      ADD CONSTRAINT "Tutor_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
