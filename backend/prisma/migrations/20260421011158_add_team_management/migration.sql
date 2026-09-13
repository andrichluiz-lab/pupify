-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('presente', 'ausente', 'folga');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ferias', 'licenca_medica', 'licenca_maternidade', 'outro');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('pendente', 'aprovado', 'rejeitado');

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "daysOfWeek" INTEGER[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftAssignment" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'folga',
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3),
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'pendente',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Shift_tenantId_idx" ON "Shift"("tenantId");

-- CreateIndex
CREATE INDEX "Shift_active_idx" ON "Shift"("active");

-- CreateIndex
CREATE INDEX "ShiftAssignment_shiftId_idx" ON "ShiftAssignment"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftAssignment_userId_idx" ON "ShiftAssignment"("userId");

-- CreateIndex
CREATE INDEX "ShiftAssignment_tenantId_idx" ON "ShiftAssignment"("tenantId");

-- CreateIndex
CREATE INDEX "ShiftAssignment_date_idx" ON "ShiftAssignment"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftAssignment_shiftId_userId_date_key" ON "ShiftAssignment"("shiftId", "userId", "date");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_idx" ON "TimeEntry"("userId");

-- CreateIndex
CREATE INDEX "TimeEntry_tenantId_idx" ON "TimeEntry"("tenantId");

-- CreateIndex
CREATE INDEX "TimeEntry_date_idx" ON "TimeEntry"("date");

-- CreateIndex
CREATE INDEX "LeaveRequest_userId_idx" ON "LeaveRequest"("userId");

-- CreateIndex
CREATE INDEX "LeaveRequest_tenantId_idx" ON "LeaveRequest"("tenantId");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_idx" ON "LeaveRequest"("status");

-- CreateIndex
CREATE INDEX "LeaveRequest_startDate_idx" ON "LeaveRequest"("startDate");

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
