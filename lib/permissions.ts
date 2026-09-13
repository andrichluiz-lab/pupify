// Shared permission types — mirrors the backend's Prisma enum.
// Keep this list in sync with backend/prisma/schema.prisma `enum Permission`.

export const PERMISSIONS = [
  // patients
  'patients_view',
  'patients_create',
  'patients_edit',
  'patients_delete',
  // agenda
  'agenda_view',
  'agenda_create',
  'agenda_edit',
  'agenda_delete',
  'agenda_cancel',
  // consultations
  'consultations_view',
  'consultations_create',
  'consultations_edit',
  'consultations_delete',
  'consultations_ai',
  // hospitalizations
  'hospitalizations_view',
  'hospitalizations_create',
  'hospitalizations_edit',
  'hospitalizations_delete',
  // surgeries
  'surgeries_view',
  'surgeries_create',
  'surgeries_edit',
  'surgeries_delete',
  // financial
  'financial_view',
  'financial_create',
  'financial_edit',
  'financial_delete',
  'financial_reports',
  // inventory
  'inventory_view',
  'inventory_create',
  'inventory_edit',
  'inventory_delete',
  // services
  'services_view',
  'services_create',
  'services_edit',
  'services_delete',
  // templates
  'templates_view',
  'templates_create',
  'templates_edit',
  'templates_delete',
  // files
  'files_view',
  'files_upload',
  'files_delete',
  // team
  'team_view',
  'team_create',
  'team_edit',
  'team_delete',
  'team_permissions',
  // dashboard
  'dashboard_view',
  // settings
  'settings_view',
  'settings_edit',
  'settings_clinic',
  // whatsapp
  'whatsapp_view',
  'whatsapp_send',
  'whatsapp_manage',
  // image exams
  'image_exams_view',
  'image_exams_create',
  'image_exams_edit',
  'image_exams_delete',
  'image_exams_ai',
  // fichas
  'fichas_view',
  'fichas_create',
  'fichas_edit',
  'fichas_delete',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const PERMISSION_GROUPS: { module: string; label: string; permissions: Permission[] }[] = [
  { module: 'patients', label: 'Pacientes', permissions: ['patients_view', 'patients_create', 'patients_edit', 'patients_delete'] },
  { module: 'agenda', label: 'Agenda', permissions: ['agenda_view', 'agenda_create', 'agenda_edit', 'agenda_delete', 'agenda_cancel'] },
  { module: 'consultations', label: 'Atendimentos', permissions: ['consultations_view', 'consultations_create', 'consultations_edit', 'consultations_delete', 'consultations_ai'] },
  { module: 'hospitalizations', label: 'Internações', permissions: ['hospitalizations_view', 'hospitalizations_create', 'hospitalizations_edit', 'hospitalizations_delete'] },
  { module: 'surgeries', label: 'Cirurgias', permissions: ['surgeries_view', 'surgeries_create', 'surgeries_edit', 'surgeries_delete'] },
  { module: 'financial', label: 'Financeiro', permissions: ['financial_view', 'financial_create', 'financial_edit', 'financial_delete', 'financial_reports'] },
  { module: 'inventory', label: 'Estoque', permissions: ['inventory_view', 'inventory_create', 'inventory_edit', 'inventory_delete'] },
  { module: 'services', label: 'Serviços', permissions: ['services_view', 'services_create', 'services_edit', 'services_delete'] },
  { module: 'templates', label: 'Modelos de documentos', permissions: ['templates_view', 'templates_create', 'templates_edit', 'templates_delete'] },
  { module: 'files', label: 'Arquivos', permissions: ['files_view', 'files_upload', 'files_delete'] },
  { module: 'team', label: 'Equipe', permissions: ['team_view', 'team_create', 'team_edit', 'team_delete', 'team_permissions'] },
  { module: 'dashboard', label: 'Dashboard', permissions: ['dashboard_view'] },
  { module: 'settings', label: 'Configurações', permissions: ['settings_view', 'settings_edit', 'settings_clinic'] },
  { module: 'whatsapp', label: 'WhatsApp', permissions: ['whatsapp_view', 'whatsapp_send', 'whatsapp_manage'] },
  { module: 'image_exams', label: 'Exames de Imagens', permissions: ['image_exams_view', 'image_exams_create', 'image_exams_edit', 'image_exams_delete', 'image_exams_ai'] },
  { module: 'fichas', label: 'Fichas de atendimento', permissions: ['fichas_view', 'fichas_create', 'fichas_edit', 'fichas_delete'] },
]

export const PERMISSION_LABELS: Record<Permission, string> = {
  patients_view: 'Visualizar pacientes',
  patients_create: 'Criar pacientes',
  patients_edit: 'Editar pacientes',
  patients_delete: 'Excluir pacientes',
  agenda_view: 'Visualizar agenda',
  agenda_create: 'Criar agendamentos',
  agenda_edit: 'Editar agendamentos',
  agenda_delete: 'Excluir agendamentos',
  agenda_cancel: 'Cancelar agendamentos',
  consultations_view: 'Visualizar atendimentos',
  consultations_create: 'Criar atendimentos',
  consultations_edit: 'Editar atendimentos',
  consultations_delete: 'Excluir atendimentos',
  consultations_ai: 'Usar IA em atendimentos',
  hospitalizations_view: 'Visualizar internações',
  hospitalizations_create: 'Criar internações',
  hospitalizations_edit: 'Editar internações',
  hospitalizations_delete: 'Excluir internações',
  surgeries_view: 'Visualizar cirurgias',
  surgeries_create: 'Criar cirurgias',
  surgeries_edit: 'Editar cirurgias',
  surgeries_delete: 'Excluir cirurgias',
  financial_view: 'Visualizar financeiro',
  financial_create: 'Criar transações',
  financial_edit: 'Editar transações',
  financial_delete: 'Excluir transações',
  financial_reports: 'Acessar relatórios financeiros',
  inventory_view: 'Visualizar estoque',
  inventory_create: 'Criar itens de estoque',
  inventory_edit: 'Editar itens de estoque',
  inventory_delete: 'Excluir itens de estoque',
  services_view: 'Visualizar serviços',
  services_create: 'Criar serviços',
  services_edit: 'Editar serviços',
  services_delete: 'Excluir serviços',
  templates_view: 'Visualizar modelos',
  templates_create: 'Criar modelos',
  templates_edit: 'Editar modelos',
  templates_delete: 'Excluir modelos',
  files_view: 'Visualizar arquivos',
  files_upload: 'Fazer upload de arquivos',
  files_delete: 'Excluir arquivos',
  team_view: 'Visualizar equipe',
  team_create: 'Adicionar membros',
  team_edit: 'Editar membros',
  team_delete: 'Remover membros',
  team_permissions: 'Gerenciar permissões da equipe',
  dashboard_view: 'Visualizar dashboard',
  settings_view: 'Visualizar configurações',
  settings_edit: 'Editar configurações',
  settings_clinic: 'Configurações da clínica',
  whatsapp_view: 'Visualizar WhatsApp',
  whatsapp_send: 'Enviar mensagens',
  whatsapp_manage: 'Gerenciar WhatsApp',
  image_exams_view: 'Visualizar exames de imagens',
  image_exams_create: 'Criar exames de imagens',
  image_exams_edit: 'Editar exames de imagens',
  image_exams_delete: 'Excluir exames de imagens',
  image_exams_ai: 'Usar IA em exames de imagens',
  fichas_view: 'Visualizar fichas de atendimento',
  fichas_create: 'Abrir fichas de atendimento',
  fichas_edit: 'Editar fichas de atendimento',
  fichas_delete: 'Excluir fichas de atendimento',
}

export interface UserPermissionOverride {
  permission: Permission
  granted: boolean
}

export interface UserPermissionsResponse {
  userTenant: {
    id: string
    userId: string
    role: string
    permVersion: number
    user: { id: string; name: string; email: string }
  }
  effective: Permission[]
  overrides: Array<{
    permission: Permission
    granted: boolean
    updatedAt: string
    updatedBy: string | null
  }>
  defaults: Permission[]
}
