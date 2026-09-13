-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'CLINIC_ADMIN', 'VETERINARIAN', 'RECEPTIONIST', 'TECHNICIAN', 'CLIENT');

-- CreateEnum
CREATE TYPE "Species" AS ENUM ('Cao', 'Gato', 'Ave', 'Roedor', 'Reptil', 'Outro');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('consulta', 'retorno', 'vacina', 'cirurgia', 'exame', 'banho_tosa', 'emergencia');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'falta');

-- CreateEnum
CREATE TYPE "HospitalizationStatus" AS ENUM ('estavel', 'observacao', 'critico', 'recuperacao');

-- CreateEnum
CREATE TYPE "MedicalRecordStatus" AS ENUM ('gravando', 'transcrevendo', 'rascunho', 'finalizado');

-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('medicamento', 'vacina', 'insumo', 'racao', 'acessorio');

-- CreateEnum
CREATE TYPE "TxDirection" AS ENUM ('entrada', 'saida');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('pago', 'pendente', 'atrasado');

-- CreateEnum
CREATE TYPE "TxCategory" AS ENUM ('consulta', 'cirurgia', 'exame', 'produto', 'salario', 'aluguel', 'fornecedor', 'utilidades', 'marketing', 'outros');

-- CreateEnum
CREATE TYPE "TxMethod" AS ENUM ('pix', 'credito', 'debito', 'dinheiro', 'boleto');

-- CreateEnum
CREATE TYPE "SurgeryRisk" AS ENUM ('baixo', 'medio', 'alto');

-- CreateEnum
CREATE TYPE "SurgeryStatus" AS ENUM ('agendada', 'pre_op', 'em_andamento', 'recuperacao', 'concluida', 'cancelada');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cnpj" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTenant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tutor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "cpf" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tutor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Veterinarian" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "crmv" TEXT NOT NULL,
    "specialty" TEXT,
    "avatarUrl" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Veterinarian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" "Species" NOT NULL,
    "breed" TEXT NOT NULL,
    "sex" "Sex" NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "color" TEXT,
    "microchip" TEXT,
    "neutered" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,
    "tutorId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "allergies" TEXT[],
    "chronicConditions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "veterinarianId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "AppointmentType" NOT NULL,
    "status" "AppointmentStatus" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "room" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospitalization" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "veterinarianId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "admittedAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "kennel" TEXT NOT NULL,
    "status" "HospitalizationStatus" NOT NULL,
    "painLevel" INTEGER,
    "dietNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hospitalization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalSigns" (
    "id" TEXT NOT NULL,
    "hospitalizationId" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION,
    "heartRate" INTEGER,
    "respiratoryRate" INTEGER,
    "bloodPressure" TEXT,
    "oxygenSaturation" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitalSigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentOrder" (
    "id" TEXT NOT NULL,
    "hospitalizationId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "drug" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRecord" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "veterinarianId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "veterinarianName" TEXT NOT NULL,
    "durationSec" INTEGER,
    "chiefComplaint" TEXT NOT NULL,
    "status" "MedicalRecordStatus" NOT NULL,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SOAPNote" (
    "id" TEXT NOT NULL,
    "medicalRecordId" TEXT NOT NULL,
    "subjective" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "assessment" TEXT NOT NULL,
    "plan" TEXT NOT NULL,

    CONSTRAINT "SOAPNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "medicalRecordId" TEXT NOT NULL,
    "drug" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InventoryCategory" NOT NULL,
    "unit" TEXT NOT NULL,
    "stock" DOUBLE PRECISION NOT NULL,
    "minStock" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "salePrice" DOUBLE PRECISION NOT NULL,
    "supplier" TEXT,
    "batch" TEXT,
    "expiresAt" TIMESTAMP(3),
    "requiresPrescription" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "direction" "TxDirection" NOT NULL,
    "category" "TxCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "TxStatus" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "counterparty" TEXT NOT NULL,
    "method" "TxMethod",
    "patientId" TEXT,
    "tutorId" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Surgery" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "veterinarianId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "procedure" TEXT NOT NULL,
    "surgeon" TEXT NOT NULL,
    "anesthetist" TEXT,
    "assistant" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "estimatedDurationMin" INTEGER NOT NULL,
    "room" TEXT NOT NULL,
    "risk" "SurgeryRisk" NOT NULL,
    "status" "SurgeryStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Surgery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "surgeryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_cnpj_key" ON "Tenant"("cnpj");

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_active_idx" ON "Tenant"("active");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_active_idx" ON "User"("active");

-- CreateIndex
CREATE INDEX "UserTenant_userId_idx" ON "UserTenant"("userId");

-- CreateIndex
CREATE INDEX "UserTenant_tenantId_idx" ON "UserTenant"("tenantId");

-- CreateIndex
CREATE INDEX "UserTenant_role_idx" ON "UserTenant"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserTenant_userId_tenantId_key" ON "UserTenant"("userId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Tutor_email_key" ON "Tutor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tutor_cpf_key" ON "Tutor"("cpf");

-- CreateIndex
CREATE INDEX "Veterinarian_tenantId_idx" ON "Veterinarian"("tenantId");

-- CreateIndex
CREATE INDEX "Veterinarian_crmv_idx" ON "Veterinarian"("crmv");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_microchip_key" ON "Patient"("microchip");

-- CreateIndex
CREATE INDEX "Patient_tutorId_idx" ON "Patient"("tutorId");

-- CreateIndex
CREATE INDEX "Patient_tenantId_idx" ON "Patient"("tenantId");

-- CreateIndex
CREATE INDEX "Patient_species_idx" ON "Patient"("species");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_tutorId_idx" ON "Appointment"("tutorId");

-- CreateIndex
CREATE INDEX "Appointment_veterinarianId_idx" ON "Appointment"("veterinarianId");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_idx" ON "Appointment"("tenantId");

-- CreateIndex
CREATE INDEX "Appointment_startsAt_idx" ON "Appointment"("startsAt");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Hospitalization_patientId_idx" ON "Hospitalization"("patientId");

-- CreateIndex
CREATE INDEX "Hospitalization_tenantId_idx" ON "Hospitalization"("tenantId");

-- CreateIndex
CREATE INDEX "Hospitalization_status_idx" ON "Hospitalization"("status");

-- CreateIndex
CREATE INDEX "Hospitalization_admittedAt_idx" ON "Hospitalization"("admittedAt");

-- CreateIndex
CREATE INDEX "VitalSigns_hospitalizationId_idx" ON "VitalSigns"("hospitalizationId");

-- CreateIndex
CREATE INDEX "TreatmentOrder_hospitalizationId_idx" ON "TreatmentOrder"("hospitalizationId");

-- CreateIndex
CREATE INDEX "MedicalRecord_patientId_idx" ON "MedicalRecord"("patientId");

-- CreateIndex
CREATE INDEX "MedicalRecord_veterinarianId_idx" ON "MedicalRecord"("veterinarianId");

-- CreateIndex
CREATE INDEX "MedicalRecord_tenantId_idx" ON "MedicalRecord"("tenantId");

-- CreateIndex
CREATE INDEX "MedicalRecord_status_idx" ON "MedicalRecord"("status");

-- CreateIndex
CREATE INDEX "MedicalRecord_createdAt_idx" ON "MedicalRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SOAPNote_medicalRecordId_key" ON "SOAPNote"("medicalRecordId");

-- CreateIndex
CREATE INDEX "Prescription_medicalRecordId_idx" ON "Prescription"("medicalRecordId");

-- CreateIndex
CREATE INDEX "InventoryItem_tenantId_idx" ON "InventoryItem"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryItem_category_idx" ON "InventoryItem"("category");

-- CreateIndex
CREATE INDEX "InventoryItem_sku_idx" ON "InventoryItem"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_tenantId_sku_key" ON "InventoryItem"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "FinancialTransaction_direction_idx" ON "FinancialTransaction"("direction");

-- CreateIndex
CREATE INDEX "FinancialTransaction_category_idx" ON "FinancialTransaction"("category");

-- CreateIndex
CREATE INDEX "FinancialTransaction_status_idx" ON "FinancialTransaction"("status");

-- CreateIndex
CREATE INDEX "FinancialTransaction_dueDate_idx" ON "FinancialTransaction"("dueDate");

-- CreateIndex
CREATE INDEX "FinancialTransaction_patientId_idx" ON "FinancialTransaction"("patientId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_tutorId_idx" ON "FinancialTransaction"("tutorId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_tenantId_idx" ON "FinancialTransaction"("tenantId");

-- CreateIndex
CREATE INDEX "Surgery_patientId_idx" ON "Surgery"("patientId");

-- CreateIndex
CREATE INDEX "Surgery_veterinarianId_idx" ON "Surgery"("veterinarianId");

-- CreateIndex
CREATE INDEX "Surgery_tenantId_idx" ON "Surgery"("tenantId");

-- CreateIndex
CREATE INDEX "Surgery_scheduledFor_idx" ON "Surgery"("scheduledFor");

-- CreateIndex
CREATE INDEX "Surgery_status_idx" ON "Surgery"("status");

-- CreateIndex
CREATE INDEX "ChecklistItem_surgeryId_idx" ON "ChecklistItem"("surgeryId");

-- AddForeignKey
ALTER TABLE "UserTenant" ADD CONSTRAINT "UserTenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTenant" ADD CONSTRAINT "UserTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Veterinarian" ADD CONSTRAINT "Veterinarian_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "Veterinarian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hospitalization" ADD CONSTRAINT "Hospitalization_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hospitalization" ADD CONSTRAINT "Hospitalization_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "Veterinarian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hospitalization" ADD CONSTRAINT "Hospitalization_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalSigns" ADD CONSTRAINT "VitalSigns_hospitalizationId_fkey" FOREIGN KEY ("hospitalizationId") REFERENCES "Hospitalization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentOrder" ADD CONSTRAINT "TreatmentOrder_hospitalizationId_fkey" FOREIGN KEY ("hospitalizationId") REFERENCES "Hospitalization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "Veterinarian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SOAPNote" ADD CONSTRAINT "SOAPNote_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surgery" ADD CONSTRAINT "Surgery_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surgery" ADD CONSTRAINT "Surgery_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "Veterinarian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surgery" ADD CONSTRAINT "Surgery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
