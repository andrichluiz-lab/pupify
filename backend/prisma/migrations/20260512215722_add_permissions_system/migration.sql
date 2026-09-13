-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('patients_view', 'patients_create', 'patients_edit', 'patients_delete', 'agenda_view', 'agenda_create', 'agenda_edit', 'agenda_delete', 'agenda_cancel', 'consultations_view', 'consultations_create', 'consultations_edit', 'consultations_delete', 'consultations_ai', 'hospitalizations_view', 'hospitalizations_create', 'hospitalizations_edit', 'hospitalizations_delete', 'surgeries_view', 'surgeries_create', 'surgeries_edit', 'surgeries_delete', 'financial_view', 'financial_create', 'financial_edit', 'financial_delete', 'financial_reports', 'inventory_view', 'inventory_create', 'inventory_edit', 'inventory_delete', 'services_view', 'services_create', 'services_edit', 'services_delete', 'templates_view', 'templates_create', 'templates_edit', 'templates_delete', 'files_view', 'files_upload', 'files_delete', 'team_view', 'team_create', 'team_edit', 'team_delete', 'team_permissions', 'dashboard_view', 'settings_view', 'settings_edit', 'settings_clinic');

-- AlterTable
ALTER TABLE "UserTenant" ADD COLUMN     "permVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permission" "Permission" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userTenantId" TEXT NOT NULL,
    "permission" "Permission" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RolePermission_role_idx" ON "RolePermission"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_permission_key" ON "RolePermission"("role", "permission");

-- CreateIndex
CREATE INDEX "UserPermission_userTenantId_idx" ON "UserPermission"("userTenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userTenantId_permission_key" ON "UserPermission"("userTenantId", "permission");

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userTenantId_fkey" FOREIGN KEY ("userTenantId") REFERENCES "UserTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
