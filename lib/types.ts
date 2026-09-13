// Domain types for VetSaaS
// These shapes mirror what a Fastify backend would return, so moving from
// the mock data layer (lib/data.ts) to real HTTP calls is straightforward.

export type Species = "Cão" | "Gato" | "Ave" | "Roedor" | "Réptil" | "Outro"
export type Sex = "M" | "F"

export interface TutorContact {
  type: string
  phone: string
  isWhatsapp: boolean
  notes?: string
}

export interface Tutor {
  id: string
  tenantId?: string | null
  name: string
  email?: string | null
  phone: string
  cpf?: string | null
  address?: string | null
  personType?: string | null
  rg?: string | null
  nationality?: string | null
  sex?: string | null
  birthDate?: string | null
  howFound?: string | null
  profession?: string | null
  municipalRegistration?: string | null
  cep?: string | null
  addressStreet?: string | null
  addressNumber?: string | null
  addressComplement?: string | null
  addressNeighborhood?: string | null
  addressCity?: string | null
  addressState?: string | null
  addressReference?: string | null
  contacts?: TutorContact[] | null
  notes?: string | null
  tags?: string[]
  acceptEmail?: boolean
  acceptSms?: boolean
  acceptCampaignSms?: boolean
  acceptWhatsapp?: boolean
  createdAt: string
}

export interface TutorWithDetails extends Tutor {
  patients: Array<{
    id: string
    name: string
    species: Species
    breed: string
  }>
  patientsCount: number
  lastAppointmentAt: string | null
  pendingBalance: number
}

export interface TutorDetail extends Tutor {
  patients: Patient[]
  appointments: Array<
    Appointment & {
      patient: { id: string; name: string; species: Species }
      veterinarian: { id: string; name: string }
    }
  >
  transactions: Array<
    FinancialTransaction & {
      patient: { id: string; name: string } | null
    }
  >
}

export interface Patient {
  id: string
  name: string
  species: Species
  breed: string
  sex: Sex
  birthDate: string // ISO
  weightKg: number
  color?: string
  microchip?: string
  neutered: boolean
  photoUrl?: string
  tutorId: string
  tutor?: Tutor
  allergies?: string[]
  chronicConditions?: string[]
  createdAt: string
}

export type AppointmentStatus =
  | "agendado"
  | "confirmado"
  | "em_atendimento"
  | "concluido"
  | "cancelado"
  | "falta"

export type AppointmentType =
  | "consulta"
  | "retorno"
  | "vacina"
  | "cirurgia"
  | "exame"
  | "banho_tosa"
  | "emergencia"

export interface Appointment {
  id: string
  patientId: string
  patient?: Patient
  tutorId: string
  tutor?: Tutor
  veterinarianId: string
  veterinarianName: string
  type: AppointmentType
  status: AppointmentStatus
  startsAt: string // ISO
  endsAt: string // ISO
  notes?: string
  room?: string
}

export interface Veterinarian {
  id: string
  name: string
  crmv: string
  specialty?: string
  avatarUrl?: string
}

export interface Hospitalization {
  id: string
  patientId: string
  patient?: Patient
  veterinarianId: string
  veterinarian?: Veterinarian
  veterinarianName: string
  tenantId: string
  admittedAt: string
  dischargedAt?: string
  reason: string
  kennel: string
  status: "estavel" | "observacao" | "critico" | "recuperacao"
  painLevel?: number
  dietNotes?: string
  dailyRate?: number
  dischargeReport?: string | null
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  appointmentsToday: number
  appointmentsTodayDelta: number // vs last week same day
  newPatientsThisWeek: number
  newPatientsDelta: number
  hospitalized: number
  revenueThisMonth: number
  revenueDelta: number
}

export interface RevenuePoint {
  date: string // YYYY-MM-DD
  revenue: number
  appointments: number
}

// ---- Consultations (Medical Records) -----------------------------------------------

export type ConsultationMode = "ai" | "manual"
export type ConsultationStatus = "gravando" | "transcrevendo" | "rascunho" | "finalizado"
export type TemplateType = "receita" | "exame" | "termo" | "atestado" | "declaracao" | "prontuario_modelo"

export interface SOAPNote {
  subjective: string
  objective: string
  assessment: string
  plan: string
}

export interface Consultation {
  id: string
  patientId: string
  patient?: Patient
  patientName?: string
  tutorName?: string
  veterinarianName: string
  veterinarian?: Veterinarian
  createdAt: string
  durationSec?: number
  durationSeconds?: number
  chiefComplaint: string
  finalReport?: string
  mode: ConsultationMode
  status: ConsultationStatus
  anamnesis?: string
  differentialDiagnosis?: string
  diagnosticPlan?: string
  treatmentPlan?: string
  notes?: string
  symptoms?: Symptom[]
  pdvItems?: Array<{ id: string; type: 'service' | 'product'; name: string; price: number; quantity: number }>
  diagnosis?: string
  soap?: SOAPNote
  prescriptions?: Array<{ drug: string; dosage: string; frequency: string; duration: string }>
  tags?: string[]
  consultationDocuments?: ConsultationDocument[]
}

export interface Symptom {
  id: string
  name: string
  severity: "leve" | "moderado" | "grave"
  duration?: string
  notes?: string
}

export interface DraftSymptom {
  name: string
  severity?: string
  duration?: string
  notes?: string
}

export interface TranscriptSegment {
  speaker: "veterinario" | "tutor"
  text: string
  timestampSeconds?: number
}

export interface SOAPData {
  subjective: string[]
  objective: string[]
  assessment: string[]
  plan: string[]
}

export interface ConsultationDraft {
  id: string
  patientId?: string
  patientName: string
  tutorName: string
  specialty: string
  mode?: ConsultationMode
  transcript?: unknown
  soapJson?: SOAPData
  finalReport?: string
  durationSeconds: number
  audioS3Key?: string
  veterinarianId: string
  veterinarianName?: string
  veterinarian?: Veterinarian
  tenantId: string
  lastAutosaveAt: string
  createdAt: string
  transcripts?: TranscriptSegment[]
  status?: string
  patient?: Patient
  chiefComplaint?: string
  durationSec?: number
  // Campos para modo manual estruturado
  anamnesis?: string
  symptoms?: DraftSymptom[]
  diagnosis?: string
  diagnosticPlan?: string
  treatmentPlan?: string
  notes?: string
  pdvItems?: Array<{
    id: string
    type: "service" | "product"
    name: string
    price: number
    quantity: number
  }>
}

export interface SaveDraftInput {
  draftId?: string
  patientId?: string
  patientName: string
  tutorName: string
  specialty?: string
  mode?: ConsultationMode
  transcript?: TranscriptSegment[]
  soapJson?: SOAPData
  finalReport?: string
  durationSeconds?: number
  // Campos para modo manual estruturado
  anamnesis?: string
  symptoms?: DraftSymptom[]
  diagnosis?: string
  diagnosticPlan?: string
  treatmentPlan?: string
  notes?: string
  pdvItems?: Array<{
    id: string
    type: "service" | "product"
    name: string
    price: number
    quantity: number
  }>
}

export interface DocumentTemplate {
  id: string
  tenantId: string
  type: TemplateType
  name: string
  description?: string
  content: string
  variables?: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ConsultationDocument {
  id: string
  consultationId: string
  templateId?: string
  type: TemplateType
  title: string
  content: string
  printedAt?: string
  sharedVia?: string
  createdAt: string
  updatedAt: string
}

export interface FileRecord {
  id: string
  filename: string
  originalName: string
  mimeType: string
  sizeBytes: number
  key: string
  bucket: string
  entityType: string
  entityId: string
  tenantId: string
  uploadedBy: string
  createdAt: string
  url?: string
}

export interface CreateConsultationDocumentInput {
  draftId?: string
  medicalRecordId?: string
  type: TemplateType
  title: string
  content: string
  templateId?: string
}

// Legacy type alias for backward compatibility
export type MedicalRecordStatus = ConsultationStatus
export type MedicalRecord = Consultation

// ── WhatsApp ─────────────────────────────────────────────────────────────────

export type WhatsAppStatus = 'disconnected' | 'connecting' | 'connected'

export interface WhatsAppAnalytics {
  totalConversations: number
  activeConversations: number
  sentCount: number
  receivedCount: number
  messagesByType: { type: string; count: number }[]
  messagesPerDay: { date: string; count: number }[]
}

export interface WhatsAppLabel {
  id: string
  tenantId: string
  name: string
  color: string
  createdAt: string
}

export interface WhatsAppInstance {
  id: string
  tenantId: string
  instanceName: string
  instanceId: string | null
  instanceToken: string | null
  status: WhatsAppStatus
  phoneNumber: string | null
  autoReplyEnabled: boolean
  autoReplyOutOfHours: string | null
  autoReplyGreeting: string | null
  createdAt: string
  updatedAt: string
}

export interface WhatsAppQuickReply {
  id: string
  tenantId: string
  shortcut: string
  content: string
  createdAt: string
}

export interface WhatsAppAutoResponse {
  id: string
  tenantId: string
  trigger: string
  response: string
  active: boolean
  createdAt: string
}

export interface WhatsAppTeamMember {
  id: string
  name: string
  avatarUrl?: string | null
  role: string
}

export interface WhatsAppContact {
  id: string
  instanceId: string
  tenantId: string
  jid: string
  name: string | null
  phone: string
  profilePic: string | null
  patientId: string | null
  tutorId: string | null
  assignedToId?: string | null
  lastMessageAt: string | null
  archived: boolean
  internalNotes: string | null
  createdAt: string
  updatedAt: string
  unreadCount?: number
  labels?: Pick<WhatsAppLabel, 'id' | 'name' | 'color'>[]
  patient?: { id: string; name: string; species: string } | null
  tutor?: { id: string; name: string } | null
  assignedTo?: { id: string; name: string; avatarUrl?: string | null } | null
  messages?: WhatsAppMessage[]
}

export interface WhatsAppMessage {
  id: string
  instanceId: string
  tenantId: string
  contactId: string
  messageId: string
  fromMe: boolean
  body: string
  type: string
  mediaUrl: string | null
  audioDuration: number | null
  status: string
  timestamp: string
  createdAt: string
}

// ---- Inventory ----------------------------------------------------------

export type InventoryCategory =
  | "medicamento"
  | "vacina"
  | "insumo"
  | "racao"
  | "acessorio"

export interface InventoryItem {
  id: string
  sku: string
  name: string
  category: InventoryCategory
  unit: string // "ml", "cp", "un", "kg"
  stock: number
  minStock: number
  unitCost: number
  salePrice: number
  supplier?: string
  batch?: string
  expiresAt?: string // ISO date
  requiresPrescription?: boolean
}

export interface Service {
  id: string
  name: string
  description?: string | null
  category: string
  price: number
  durationMin?: number | null
  active: boolean
  tenantId: string
  createdAt: string
  updatedAt: string
}

// ---- Financial ---------------------------------------------------------

export type TxDirection = "entrada" | "saida"
export type TxStatus = "pago" | "pendente" | "atrasado"
export type TxCategory =
  | "consulta"
  | "cirurgia"
  | "exame"
  | "produto"
  | "salario"
  | "aluguel"
  | "fornecedor"
  | "utilidades"
  | "marketing"
  | "outros"

export type TxMethod = "pix" | "credito" | "debito" | "dinheiro" | "boleto"

// ---- Ficha Aberta (Open Encounter) -------------------------------------

export type FichaStatus = "aberto" | "aguardando_cobranca" | "fechado"
export type FichaItemType = "servico" | "produto" | "consulta" | "exame" | "cirurgia" | "vacina"

export interface FichaItem {
  id: string
  fichaId: string
  type: FichaItemType | string
  sourceId?: string | null
  sourceType?: string | null
  name: string
  quantity: number
  unitPrice: number
  total: number
  addedById?: string | null
  addedAt: string
}

export interface FichaSource {
  id: string
  createdAt: string
  veterinarian?: { name: string } | null
  type?: string // only for exames
}

export interface FichaSources {
  consultas: Record<string, FichaSource>
  exames: Record<string, FichaSource>
}

export interface Ficha {
  id: string
  tenantId: string
  patientId: string
  tutorId?: string | null
  status: FichaStatus
  openedAt: string
  closedAt?: string | null
  openedById?: string | null
  closedById?: string | null
  notes?: string | null
  totalAmount: number
  paymentMethod?: string | null
  transactionId?: string | null
  items: FichaItem[]
  sources?: FichaSources
  patient?: {
    id: string
    name: string
    species: string
    breed: string
    tutorId: string
  } | null
  tutor?: {
    id: string
    name: string
    phone: string
    email?: string | null
  } | null
}

export interface FinancialTransaction {
  id: string
  direction: TxDirection
  category: TxCategory
  description: string
  amount: number
  status: TxStatus
  dueDate: string
  paidAt?: string
  counterparty: string
  method?: TxMethod
  patientId?: string
  tutorId?: string
  fichaId?: string | null
  ficha?: {
    id: string
    items: Array<{
      id: string
      name: string
      quantity: number
      unitPrice: number
      total: number
      type: string
    }>
  } | null
}

// ---- Surgeries ----------------------------------------------------------

export type SurgeryStatus =
  | "agendada"
  | "pre_op"
  | "em_andamento"
  | "recuperacao"
  | "concluida"
  | "cancelada"

export type SurgeryRisk = "baixo" | "medio" | "alto"

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
  order: number
}

export interface Surgery {
  id: string
  patientId: string
  patient?: Patient
  veterinarianId: string
  veterinarian?: Veterinarian
  procedure: string
  surgeon: string
  anesthetist?: string
  assistant?: string
  scheduledFor: string // ISO
  estimatedDurationMin: number
  room: string
  risk: SurgeryRisk
  status: SurgeryStatus
  notes?: string
  surgeryNotes?: string
  anesthesiaNotes?: string
  pdvItems?: Array<{ id: string; type: "service" | "product"; name: string; price: number; quantity: number }>
  createdAt: string
  updatedAt: string
  checklistItems?: ChecklistItem[]
}

// ---- Hospitalization (ICU-style) ---------------------------------------

export interface VitalSigns {
  temperature?: number // °C
  heartRate?: number // bpm
  respiratoryRate?: number // rpm
  bloodPressure?: string // "120/80"
  oxygenSaturation?: number // %
  updatedAt: string
}

export interface TreatmentOrder {
  id: string
  time: string // "08:00"
  drug: string
  dose: string
  route: string // "IV", "SC", "VO"
  done: boolean
}

export interface HospitalizationDetail extends Hospitalization {
  vitals?: VitalSigns
  orders?: TreatmentOrder[]
  painLevel?: 0 | 1 | 2 | 3 | 4 | 5
  dietNotes?: string
}

// ---- Team Management -------------------------------------------------------

export interface TeamStats {
  totalMembers: number
  presentToday: number
  onLeave: number
  onVacation: number
}

export interface TeamMember {
  id: string
  userId: string
  name: string
  email: string
  role: string
  avatarUrl?: string
  status: 'presente' | 'folga' | 'ferias' | 'ausente'
  specialty?: string
  crmv?: string
}

export interface CreateTeamMemberInput {
  name: string
  email: string
  password: string
  role: string
  crmv?: string
  specialty?: string
  tenantId?: string
}

export interface TeamShift {
  id: string
  member: string
  date: string
  shift: string
  role: string
}

export interface TimeEntry {
  id: string
  userId: string
  tenantId: string
  date: string
  checkIn: string
  checkOut?: string
  breakMinutes: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CreateTimeEntryInput {
  userId: string
  notes?: string
}

export interface LeaveRequest {
  id: string
  userId: string
  tenantId: string
  type: 'ferias' | 'licenca_medica' | 'licenca_maternidade' | 'outro'
  startDate: string
  endDate: string
  reason?: string
  status: 'pendente' | 'aprovado' | 'rejeitado'
  approvedBy?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreateLeaveRequestInput {
  userId: string
  type: 'ferias' | 'licenca_medica' | 'licenca_maternidade' | 'outro'
  startDate: string
  endDate: string
  reason?: string
}

export interface ApproveLeaveRequestInput {
  approvedBy: string
}

export interface Shift {
  id: string
  tenantId: string
  name: string
  startTime: string
  endTime: string
  daysOfWeek: number[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateShiftInput {
  name: string
  startTime: string
  endTime: string
  daysOfWeek: number[]
}

export interface ShiftAssignment {
  id: string
  shiftId: string
  userId: string
  tenantId: string
  date: string
  status: 'presente' | 'ausente' | 'folga'
  checkInAt?: string
  checkOutAt?: string
  createdAt: string
  updatedAt: string
  shift?: Shift
}

export interface CreateShiftAssignmentInput {
  shiftId: string
  userId: string
  date: string
}

// ---- User Settings -------------------------------------------------------

export interface UpdateProfileInput {
  name: string
  avatarUrl?: string | null
}

export interface UpdatePasswordInput {
  currentPassword: string
  newPassword: string
}

// ---- Tenant Settings -----------------------------------------------------

export interface Tenant {
  id: string
  name: string
  slug: string
  cnpj: string | null
  phone: string | null
  email: string | null
  address: string | null
  operatingHours?: string | null
  active: boolean
  createdAt: string
  onboardingCompleted: boolean
  onboardingStep: number
  updatedAt: string
}

export interface UpdateTenantInput {
  name?: string
  cnpj?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
}

// ---- User Management ------------------------------------------------------

export type UserRole = 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'VETERINARIAN' | 'RECEPTIONIST' | 'TECHNICIAN' | 'CLIENT'

export interface UserWithRole {
  id: string
  email: string
  name: string
  avatarUrl?: string | null
  active: boolean
  role: UserRole
  createdAt: string
  userTenantId: string
}

export interface AddUserInput {
  name: string
  email: string
  password?: string
  role: UserRole
  sendInvite: boolean
}

export interface UpdateUserRoleInput {
  role: UserRole
}

export interface UpdateUserStatusInput {
  active: boolean
}

// ---- Notifications --------------------------------------------------------

export type NotificationType =
  | 'appointment_assigned'
  | 'appointment_updated'
  | 'appointment_cancelled'
  | 'general'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  link?: string
  createdAt: string
}

// ---- Kanban Filters -------------------------------------------------------

export interface KanbanFilters {
  date?: string // ISO date
  veterinarianId?: string
  type?: AppointmentType
  status?: AppointmentStatus[]
}

// ---- Image Exams ----------------------------------------------------------

export type ImageExamType =
  | 'radiografia'
  | 'ultrassom'
  | 'tomografia'
  | 'ressonancia'
  | 'laboratorio'
  | 'outro'

export type ImageExamStatus =
  | 'pendente'
  | 'analisando'
  | 'concluido'
  | 'cancelado'

export interface ImageExam {
  id: string
  patientId: string
  patient?: Patient
  veterinarianId: string
  veterinarian?: Veterinarian
  tenantId: string
  type: ImageExamType
  status: ImageExamStatus
  fileId?: string
  fileIds?: string[]
  file?: {
    id: string
    filename: string
    originalName: string
    mimeType: string
    sizeBytes: number
    key: string
    url: string
    createdAt: string
  }
  extractedText?: string
  aiAnalysis?: {
    findings: string[]
    diagnosis?: string[]
    recommendations?: string[]
  }
  aiReport?: string
  veterinarianNotes?: string
  pdvItems?: Array<{
    id: string
    type: 'service' | 'product'
    name: string
    price: number
    quantity: number
  }>
  createdAt: string
  updatedAt: string
}

export interface FinalizeInput {
  method?: TxMethod
  amount?: number
}

// ---- Quotes (Orçamentos) -------------------------------------------------

export type QuoteStatus = 'pendente' | 'aprovado' | 'recusado' | 'expirado'

export interface QuoteItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Quote {
  id: string
  tutorId: string
  tutor?: Tutor
  patientId?: string | null
  patient?: { id: string; name: string; species: string } | null
  tenantId: string
  status: QuoteStatus
  items: QuoteItem[]
  total: number
  notes?: string | null
  validUntil?: string | null
  createdAt: string
  updatedAt: string
}

// ---- Agenda Events -------------------------------------------------------

export type AgendaEventType = Appointment | {
  id: string
  type: 'financeiro'
  startsAt: string
  endsAt: string
  patient: null
  veterinarianName: string
  description: string
  amount: number
  direction: TxDirection
  isTransaction: true
}
