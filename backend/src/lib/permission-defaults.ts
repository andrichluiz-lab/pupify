import { Permission, Role } from '@prisma/client'

/**
 * All permissions in the system.
 * Used by SUPER_ADMIN (implicit access to everything) and as a reference.
 */
export const ALL_PERMISSIONS: Permission[] = Object.values(Permission)

/**
 * Default permissions per role.
 * SUPER_ADMIN is NOT in this map — it gets all permissions implicitly.
 * CLIENT also has no internal permissions.
 */
export const ROLE_DEFAULTS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,

  CLINIC_ADMIN: ALL_PERMISSIONS, // admin sees/does everything within tenant

  VETERINARIAN: [
    Permission.dashboard_view,
    Permission.patients_view,
    Permission.patients_create,
    Permission.patients_edit,
    Permission.tutors_view,
    Permission.tutors_create,
    Permission.tutors_edit,
    Permission.agenda_view,
    Permission.agenda_create,
    Permission.agenda_edit,
    Permission.agenda_cancel,
    Permission.consultations_view,
    Permission.consultations_create,
    Permission.consultations_edit,
    Permission.consultations_ai,
    Permission.hospitalizations_view,
    Permission.hospitalizations_create,
    Permission.hospitalizations_edit,
    Permission.surgeries_view,
    Permission.surgeries_create,
    Permission.surgeries_edit,
    Permission.services_view,
    Permission.templates_view,
    Permission.templates_create,
    Permission.templates_edit,
    Permission.templates_delete,
    Permission.files_view,
    Permission.files_upload,
    Permission.team_view,
    Permission.settings_view,
    Permission.whatsapp_view,
    Permission.whatsapp_send,
    Permission.image_exams_view,
    Permission.image_exams_create,
    Permission.image_exams_edit,
    Permission.image_exams_ai,
    Permission.hospitalizations_ai,
    Permission.surgeries_ai,
    Permission.fichas_view,
    Permission.fichas_create,
    Permission.fichas_edit,
  ],

  RECEPTIONIST: [
    Permission.dashboard_view,
    Permission.patients_view,
    Permission.patients_create,
    Permission.tutors_view,
    Permission.tutors_create,
    Permission.tutors_edit,
    Permission.agenda_view,
    Permission.agenda_create,
    Permission.agenda_edit,
    Permission.agenda_cancel,
    Permission.financial_view,
    Permission.financial_create,
    Permission.inventory_view,
    Permission.inventory_create,
    Permission.inventory_edit,
    Permission.services_view,
    Permission.files_view,
    Permission.files_upload,
    Permission.team_view,
    Permission.whatsapp_view,
    Permission.whatsapp_send,
    Permission.whatsapp_manage,
    Permission.fichas_view,
    Permission.fichas_create,
    Permission.fichas_edit,
    Permission.fichas_delete,
  ],

  TECHNICIAN: [
    Permission.dashboard_view,
    Permission.patients_view,
    Permission.tutors_view,
    Permission.agenda_view,
    Permission.hospitalizations_view,
    Permission.inventory_view,
    Permission.team_view,
  ],

  CLIENT: [],
}
