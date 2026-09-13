-- CreateTable
CREATE TABLE "ConsultationDraft" (
    "id" TEXT NOT NULL,
    "veterinarianId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT,
    "patientName" TEXT NOT NULL,
    "tutorName" TEXT NOT NULL,
    "specialty" TEXT NOT NULL DEFAULT 'generalista',
    "transcript" JSONB,
    "soapJson" JSONB,
    "finalReport" TEXT,
    "audioS3Key" TEXT,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastAutosaveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationTranscript" (
    "id" TEXT NOT NULL,
    "consultationDraftId" TEXT NOT NULL,
    "speaker" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "timestampSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultationDraft_veterinarianId_idx" ON "ConsultationDraft"("veterinarianId");

-- CreateIndex
CREATE INDEX "ConsultationDraft_tenantId_idx" ON "ConsultationDraft"("tenantId");

-- CreateIndex
CREATE INDEX "ConsultationDraft_patientId_idx" ON "ConsultationDraft"("patientId");

-- CreateIndex
CREATE INDEX "ConsultationDraft_lastAutosaveAt_idx" ON "ConsultationDraft"("lastAutosaveAt");

-- CreateIndex
CREATE INDEX "ConsultationTranscript_consultationDraftId_idx" ON "ConsultationTranscript"("consultationDraftId");

-- CreateIndex
CREATE INDEX "ConsultationTranscript_timestampSeconds_idx" ON "ConsultationTranscript"("timestampSeconds");

-- AddForeignKey
ALTER TABLE "ConsultationTranscript" ADD CONSTRAINT "ConsultationTranscript_consultationDraftId_fkey" FOREIGN KEY ("consultationDraftId") REFERENCES "ConsultationDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
