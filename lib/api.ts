// API Service Layer
// Replaces lib/data.ts and lib/data-medical.ts with real API calls
// All functions maintain the same signatures as the original mock functions
// for seamless integration with existing components

import { get, post, put, patch, del, ApiError } from './api-client'
import type {
  Appointment,
  DashboardStats,
  Hospitalization,
  HospitalizationDetail,
  Patient,
  RevenuePoint,
  Tutor,
  TutorWithDetails,
  TutorDetail,
  Veterinarian,
  FinancialTransaction,
  InventoryItem,
  Consultation,
  Surgery,
  TeamMember,
  TeamShift,
  CreateTeamMemberInput,
  TimeEntry,
  CreateTimeEntryInput,
  LeaveRequest,
  CreateLeaveRequestInput,
  ApproveLeaveRequestInput,
  Shift,
  CreateShiftInput,
  ShiftAssignment,
  CreateShiftAssignmentInput,
  TreatmentOrder,
  VitalSigns,
  TeamStats,
  KanbanFilters,
  FinalizeInput,
  TranscriptSegment,
  SOAPData,
  ConsultationDraft,
  SaveDraftInput,
  Tenant,
  FileRecord,
  ConsultationDocument,
  CreateConsultationDocumentInput,
  DocumentTemplate,
  TemplateType,
  WhatsAppInstance,
  WhatsAppContact,
  WhatsAppMessage,
  WhatsAppLabel,
  WhatsAppQuickReply,
  WhatsAppAutoResponse,
  ImageExam,
  Quote,
  Ficha,
  FichaItem,
} from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

// ============================================================================
// PATIENTS & TUTORS
// ============================================================================

export async function listPatients(): Promise<Patient[]> {
  return await get<Patient[]>('/api/patients')
}

export async function getPatient(id: string): Promise<Patient | null> {
  try {
    return await get<Patient | null>(`/api/patients/${id}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }
    console.error(`Error fetching patient ${id}:`, error)
    throw error
  }
}

export async function createPatient(data: Partial<Patient>): Promise<Patient> {
  return await post<Patient>('/api/patients', data)
}

export async function updatePatient(id: string, data: Partial<Patient>): Promise<Patient> {
  return await put<Patient>(`/api/patients/${id}`, data)
}

export async function deletePatient(id: string): Promise<void> {
  return await del<void>(`/ents/${id}`)
}

export async function searchPatients(query: string): Promise<Patient[]> {
  if (!query.trim()) return []
  return await get<Patient[]>(`/api/patients/search?q=${encodeURIComponent(query)}`)
}

export async function listTutors(): Promise<TutorWithDetails[]> {
  return await get<TutorWithDetails[]>('/api/tutors')
}

export async function searchTutors(query: string): Promise<Tutor[]> {
  if (!query.trim()) return []
  return await get<Tutor[]>(`/api/tutors/search?q=${encodeURIComponent(query)}`)
}

export async function getTutor(id: string): Promise<Tutor | null> {
  try {
    return await get<Tutor | null>(`/api/tutors/${id}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }
    console.error(`Error fetching tutor ${id}:`, error)
    throw error
  }
}

export async function getTutorDetail(id: string): Promise<TutorDetail | null> {
  try {
    return await get<TutorDetail>(`/api/tutors/${id}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function createTutor(data: Omit<Tutor, 'id' | 'createdAt'>): Promise<Tutor> {
  return await post<Tutor>('/api/tutors', data)
}

export async function updateTutor(id: string, data: Partial<Omit<Tutor, 'id' | 'createdAt'>>): Promise<Tutor> {
  return await put<Tutor>(`/api/tutors/${id}`, data)
}

export async function getTutorPatients(id: string): Promise<Patient[]> {
  return await get<Patient[]>(`/api/tutors/${id}/patients`)
}

export async function getTutorAppointments(id: string): Promise<Appointment[]> {
  return await get<Appointment[]>(`/api/tutors/${id}/appointments`)
}

// ============================================================================
// VETERINARIANS
// ============================================================================

export async function listVeterinarians(): Promise<Veterinarian[]> {
  return await get<Veterinarian[]>('/api/veterinarians')
}

// ============================================================================
// APPOINTMENTS
// ============================================================================

export async function listAppointments(): Promise<Appointment[]> {
  return await get<Appointment[]>('/api/appointments')
}

export async function listAppointmentsForPatient(patientId: string): Promise<Appointment[]> {
  return await get<Appointment[]>(`/api/patients/${patientId}/appointments`)
}

export async function listTodayAppointments(): Promise<Appointment[]> {
  return await get<Appointment[]>('/api/appointments/today')
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  try {
    return await get<Appointment | null>(`/api/appointments/${id}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }
    console.error(`Error fetching appointment ${id}:`, error)
    throw error
  }
}

export async function createAppointment(data: Partial<Appointment>): Promise<Appointment> {
  return await post<Appointment>('/api/appointments', data)
}

export async function classifyAppointmentUrgency(
  notes: string,
  type: string,
  patientSpecies?: string,
): Promise<{ level: 'eletiva' | 'urgente' | 'emergencia'; reason: string }> {
  return await post('/api/appointments/classify-urgency', { notes, type, patientSpecies })
}

export async function updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment> {
  return await put<Appointment>(`/api/appointments/${id}`, data)
}

export async function deleteAppointment(id: string): Promise<void> {
  try {
    await del<void>(`/api/appointments/${id}`)
  } catch (error) {
    console.error(`Error deleting appointment ${id}:`, error)
    throw error
  }
}

// ============================================================================
// HOSPITALIZATIONS
// ============================================================================

export async function listHospitalizations(): Promise<Hospitalization[]> {
  return await get<Hospitalization[]>('/api/hospitalizations')
}

export async function listHospitalizationDetails(): Promise<HospitalizationDetail[]> {
  return await get<HospitalizationDetail[]>('/api/hospitalizations/details')
}

export async function getHospitalization(id: string): Promise<HospitalizationDetail | null> {
  try {
    return await get<HospitalizationDetail | null>(`/api/hospitalizations/${id}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }
    console.error(`Error fetching hospitalization ${id}:`, error)
    throw error
  }
}

export async function createHospitalization(data: Partial<Hospitalization>): Promise<Hospitalization> {
  return await post<Hospitalization>('/api/hospitalizations', data)
}

export async function updateHospitalization(id: string, data: Partial<Hospitalization>): Promise<HospitalizationDetail> {
  return await put<HospitalizationDetail>(`/api/hospitalizations/${id}`, data)
}

export async function deleteHospitalization(id: string): Promise<void> {
  return await del(`/api/hospitalizations/${id}`)
}

export async function toggleTreatmentOrderDone(id: string, done: boolean): Promise<TreatmentOrder> {
  return await put<TreatmentOrder>(`/api/treatment-orders/${id}`, { done })
}

export async function createTreatmentOrder(data: {
  hospitalizationId: string
  time: string
  drug: string
  dose: string
  route: string
}): Promise<TreatmentOrder> {
  return await post<TreatmentOrder>('/api/treatment-orders', data)
}

export async function createVitalSigns(data: {
  hospitalizationId: string
  temperature?: number
  heartRate?: number
  respiratoryRate?: number
  bloodPressure?: string
  oxygenSaturation?: number
}): Promise<VitalSigns> {
  return await post<VitalSigns>('/api/vital-signs', data)
}

// ============================================================================
// CONSULTATIONS
// ============================================================================

export async function listConsultations(): Promise<Consultation[]> {
  return await get<Consultation[]>('/api/consultations')
}

export async function getConsultation(id: string): Promise<Consultation | null> {
  try {
    return await get<Consultation | null>(`/api/consultations/${id}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }
    console.error(`Error fetching consultation ${id}:`, error)
    throw error
  }
}

export async function listConsultationsForPatient(patientId: string): Promise<Consultation[]> {
  return await get<Consultation[]>(`/api/patients/${patientId}/medical-records`)
}

export async function createConsultation(data: Partial<Consultation>): Promise<Consultation> {
  return await post<Consultation>('/api/consultations', data)
}

export async function updateConsultation(id: string, data: Partial<Consultation>): Promise<Consultation> {
  return await put<Consultation>(`/api/consultations/${id}`, data)
}

export async function deleteConsultation(id: string): Promise<void> {
  return await del(`/api/consultations/${id}`)
}

// AI-Assisted Consultation API
export async function transcribeAudio(audioBase64: string, elapsedSeconds: number, recentTranscript?: TranscriptSegment[], patientContext?: string): Promise<{ segments: TranscriptSegment[] }> {
  return await post('/api/consultations/transcribe', { audioBase64, elapsedSeconds, recentTranscript, patientContext })
}

export async function generateSOAP(transcript: TranscriptSegment[], patientName: string, tutorName: string, specialty: string, patientId?: string): Promise<SOAPData> {
  return await post('/api/consultations/generate-soap', { transcript, patientName, tutorName, specialty, patientId })
}

export async function getHistorySummary(patientId: string): Promise<{ bullets: string[]; alerts: string[]; lastVisit: string | null }> {
  return await get(`/api/consultations/history-summary?patientId=${patientId}`)
}

export interface PrescriptionSuggestion {
  drug: string
  dose: string
  frequency: string
  duration: string
  route: string
  notes?: string
}

export async function suggestPrescriptions(draftId: string): Promise<PrescriptionSuggestion[]> {
  const { suggestions } = await post<{ suggestions: PrescriptionSuggestion[] }>(
    '/api/consultations/suggest-prescriptions',
    { draftId },
  )
  return suggestions
}

export async function getDraft(): Promise<{ draft: ConsultationDraft | null }> {
  return await get('/api/consultations/draft')
}

export async function getDraftById(id: string): Promise<{ draft: ConsultationDraft | null }> {
  return await get(`/api/consultations/draft/${id}`)
}

export async function createEmptyDraft(): Promise<{ draft: ConsultationDraft }> {
  return await post('/api/consultations/draft', {
    patientName: '',
    tutorName: '',
    specialty: 'generalista',
    durationSeconds: 0,
  })
}

export async function listDrafts(): Promise<ConsultationDraft[]> {
  return await get('/api/consultations/drafts')
}

export async function saveDraft(data: SaveDraftInput): Promise<{ id: string; message: string }> {
  return await post('/api/consultations/draft', data)
}

export async function deleteDraft(id: string): Promise<{ message: string }> {
  return await del(`/api/consultations/draft?id=${id}`)
}

export async function finalizeDraft(
  draftId: string,
  amount?: number,
  method?: string,
  fichaId?: string
): Promise<{ medicalRecord: Consultation; transaction: FinancialTransaction | null }> {
  return await post('/api/consultations/finalize', { draftId, amount, method, fichaId })
}

// Legacy aliases for backward compatibility
export const listMedicalRecords = listConsultations
export const getMedicalRecord = getConsultation
export const listMedicalRecordsForPatient = listConsultationsForPatient
export const createMedicalRecord = createConsultation
export const updateMedicalRecord = updateConsultation

// ============================================================================
// INVENTORY
// ============================================================================

export async function listInventory(): Promise<InventoryItem[]> {
  return await get<InventoryItem[]>('/api/inventory')
}

export async function getInventoryItem(id: string): Promise<InventoryItem | null> {
  try {
    return await get<InventoryItem | null>(`/api/inventory/${id}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }
    console.error(`Error fetching inventory item ${id}:`, error)
    throw error
  }
}

export async function createInventoryItem(data: Partial<InventoryItem>): Promise<InventoryItem> {
  return await post<InventoryItem>('/api/inventory', data)
}

export async function updateInventoryItem(id: string, data: Partial<InventoryItem>): Promise<InventoryItem> {
  return await put<InventoryItem>(`/api/inventory/${id}`, data)
}

export async function deleteInventoryItem(id: string): Promise<void> {
  return await del<void>(`/api/inventory/${id}`)
}

// ============================================================================
// FINANCIAL TRANSACTIONS
// ============================================================================

export async function listTransactions(): Promise<FinancialTransaction[]> {
  return await get<FinancialTransaction[]>('/api/financial/transactions')
}

export async function getTransaction(id: string): Promise<FinancialTransaction | null> {
  try {
    return await get<FinancialTransaction | null>(`/api/financial/transactions/${id}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }
    console.error(`Error fetching transaction ${id}:`, error)
    throw error
  }
}

export async function createTransaction(data: Partial<FinancialTransaction>): Promise<FinancialTransaction> {
  return await post<FinancialTransaction>('/api/financial/transactions', data)
}

export async function updateTransaction(id: string, data: Partial<FinancialTransaction>): Promise<FinancialTransaction> {
  return await put<FinancialTransaction>(`/api/financial/transactions/${id}`, data)
}

export async function deleteTransaction(id: string): Promise<void> {
  return await del<void>(`/api/financial/transactions/${id}`)
}

export async function getCashflowData(): Promise<Array<{ month: string; entrada: number; saida: number }>> {
  return await get<Array<{ month: string; entrada: number; saida: number }>>('/api/financial/cashflow')
}

// ============================================================================
// SURGERIES
// ============================================================================

export async function listSurgeries(): Promise<Surgery[]> {
  return await get<Surgery[]>('/api/surgeries')
}

export async function listSurgeriesForPatient(patientId: string): Promise<Surgery[]> {
  return await get<Surgery[]>(`/api/surgeries?patientId=${patientId}`)
}

export async function generateSurgeryReport(id: string): Promise<{ report: string; surgery: Surgery }> {
  return await post<{ report: string; surgery: Surgery }>(`/api/surgeries/${id}/generate-report`, {})
}

export async function generateDischargeReport(id: string): Promise<{ report: string; instructions: string[] }> {
  return await post<{ report: string; instructions: string[] }>(`/api/hospitalizations/${id}/generate-discharge`, {})
}

export async function generateTutorInstructions(draftId: string): Promise<{ greeting: string; instructions: string[]; followUp: string | null }> {
  return await post(`/api/consultations/tutor-instructions`, { draftId })
}

export interface DailyReportResult {
  summary: string
  highlights: string[]
  alerts: string[]
  feedback: string
  stats: {
    total: number
    completed: number
    cancelled: number
    byType: Record<string, number>
  }
}

export async function generateDailyReport(date: string): Promise<DailyReportResult> {
  return await post<DailyReportResult>(`/api/appointments/daily-report`, { date })
}

export async function getSurgery(id: string): Promise<Surgery | null> {
  try {
    return await get<Surgery | null>(`/api/surgeries/${id}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }
    console.error(`Error fetching surgery ${id}:`, error)
    throw error
  }
}

export async function createSurgery(data: Partial<Surgery>): Promise<Surgery> {
  return await post<Surgery>('/api/surgeries', data)
}

export async function updateSurgery(id: string, data: Partial<Surgery>): Promise<Surgery> {
  try {
    return await put<Surgery>(`/api/surgeries/${id}`, data)
  } catch (error) {
    console.error(`Error updating surgery ${id}:`, error)
    throw error
  }
}

export async function deleteSurgery(id: string): Promise<void> {
  return await del<void>(`/api/surgeries/${id}`)
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export async function getDashboardStats(): Promise<DashboardStats> {
  return await get<DashboardStats>('/api/dashboard/stats')
}

export async function getRevenueSeries(): Promise<RevenuePoint[]> {
  return await get<RevenuePoint[]>('/api/dashboard/revenue')
}

// ============================================================================
// TEAM MANAGEMENT
// ============================================================================

export async function getTeamStats(): Promise<TeamStats> {
  return await get<TeamStats>('/api/team/stats')
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  return await get<TeamMember[]>('/api/team/members')
}

export async function getTeamShifts(): Promise<TeamShift[]> {
  return await get<TeamShift[]>('/api/team/shifts')
}

export async function createTimeEntry(data: CreateTimeEntryInput): Promise<TimeEntry> {
  return await post<TimeEntry>('/api/team/time-entry', data)
}

export async function updateTimeEntry(id: string): Promise<TimeEntry> {
  return await put<TimeEntry>(`/api/team/time-entry/${id}`, {})
}

export async function createLeaveRequest(data: CreateLeaveRequestInput): Promise<LeaveRequest> {
  return await post<LeaveRequest>('/api/team/leave-request', data)
}

export async function approveLeaveRequest(id: string, data: ApproveLeaveRequestInput): Promise<LeaveRequest> {
  return await put<LeaveRequest>(`/api/team/leave-request/${id}/approve`, data)
}

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  return await get<LeaveRequest[]>('/api/team/leave-requests')
}

export async function createShift(data: CreateShiftInput): Promise<Shift> {
  return await post<Shift>('/api/team/shifts', data)
}

export async function createShiftAssignment(data: CreateShiftAssignmentInput): Promise<ShiftAssignment> {
  return await post<ShiftAssignment>('/api/team/shift-assignments', data)
}

export async function createTeamMember(data: CreateTeamMemberInput): Promise<TeamMember> {
  return await post<TeamMember>('/api/team/members', data)
}

// ============================================================================
// ONBOARDING
// ============================================================================

export interface TenantOnboarding {
  id: string
  name: string
  slug: string
  onboardingCompleted: boolean
  onboardingStep: number
}

export async function getTenantOnboardingStatus(): Promise<TenantOnboarding> {
  return await get<TenantOnboarding>('/api/tenant')
}

export async function updateOnboardingProgress(data: {
  step?: number
  completed?: boolean
}): Promise<TenantOnboarding> {
  return await put<TenantOnboarding>('/api/tenant/onboarding', data)
}

export async function completeOnboarding(): Promise<TenantOnboarding> {
  return await updateOnboardingProgress({ completed: true })
}

export async function updateTenant(data: {
  name?: string
  cnpj?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  operatingHours?: string | null
}): Promise<Tenant> {
  return await put<Tenant>('/api/tenant', data)
}

export async function getTenantOperatingHours(): Promise<string | null> {
  try {
    const tenant = await get<Tenant>('/api/tenant')
    return tenant?.operatingHours || null
  } catch (error) {
    console.error('Error fetching tenant operating hours:', error)
    return null
  }
}

// ============================================================================
// SERVICES
// ============================================================================

export interface Service {
  id: string
  name: string
  description: string | null
  category: string
  price: number
  durationMin: number | null
  active: boolean
  tenantId: string
  createdAt: string
  updatedAt: string
}

export async function listServices(): Promise<Service[]> {
  return await get<Service[]>('/api/services')
}

export async function createService(data: Partial<Service>): Promise<Service> {
  return await post<Service>('/api/services', data)
}

export async function createServicesBulk(data: Partial<Service>[]): Promise<{ count: number }> {
  return await post<{ count: number }>('/api/services/bulk', data)
}

export async function deleteService(id: string): Promise<void> {
  return await del(`/api/services/${id}`)
}

// ============================================================================
// KANBAN
// ============================================================================

export async function listKanbanAppointments(filters: KanbanFilters = {}): Promise<Appointment[]> {
  const params = new URLSearchParams()
  if (filters.date) params.append('date', filters.date)
  if (filters.veterinarianId) params.append('veterinarianId', filters.veterinarianId)
  if (filters.type) params.append('type', filters.type)
  if (filters.status) filters.status.forEach(s => params.append('status', s))

  const queryString = params.toString()
  const url = queryString ? `/api/appointments/kanban?${queryString}` : '/api/appointments/kanban'
  return await get<Appointment[]>(url)
}

export async function updateAppointmentStatus(id: string, status: Appointment['status']): Promise<Appointment> {
  return await put<Appointment>(`/api/appointments/${id}/status`, { status })
}

export async function finalizeAppointment(id: string, data: FinalizeInput): Promise<{
  appointment: Appointment
  transaction: FinancialTransaction | null
}> {
  return await post<{ appointment: Appointment; transaction: FinancialTransaction | null }>(
    `/api/appointments/${id}/finalize`,
    data
  )
}

// ============================================================================
// FILES (S3 / Backblaze)
// ============================================================================

export async function uploadFile(
  file: File,
  entityType: string,
  entityId: string
): Promise<FileRecord> {
  const formData = new FormData()
  formData.append('entityType', entityType)
  formData.append('entityId', entityId)
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })

  if (!response.ok) {
    let detail: unknown = null
    try {
      detail = await response.json()
    } catch {
      // ignore
    }
    throw new ApiError(
      `Upload failed: ${response.statusText}`,
      response.status,
      detail
    )
  }

  return (await response.json()) as FileRecord
}

export async function listFiles(params: {
  entityType?: string
  entityId?: string
}): Promise<FileRecord[]> {
  const qs = new URLSearchParams()
  if (params.entityType) qs.set('entityType', params.entityType)
  if (params.entityId) qs.set('entityId', params.entityId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return await get<FileRecord[]>(`/api/files${suffix}`)
}

export async function getFileDownloadUrl(id: string): Promise<{ url: string }> {
  return await get<{ url: string }>(`/api/files/${id}/download`)
}

// ============================================================================
// WHATSAPP
// ============================================================================

export async function getWhatsAppInstance(): Promise<WhatsAppInstance | null> {
  try {
    return await get<WhatsAppInstance>('/api/whatsapp/instance')
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function connectWhatsApp(): Promise<WhatsAppInstance> {
  return await post<WhatsAppInstance>('/api/whatsapp/instance/connect', {})
}

export async function getWhatsAppQR(): Promise<{ base64: string; code: string } | null> {
  try {
    return await get<{ base64: string; code: string }>('/api/whatsapp/instance/qr')
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null
    throw error
  }
}

export async function disconnectWhatsApp(): Promise<void> {
  await del('/api/whatsapp/instance')
}

export async function syncWhatsAppContacts(): Promise<{ savedCount: number }> {
  return await post<{ savedCount: number }>('/api/whatsapp/instance/sync-contacts', {})
}

export async function getMessages(
  contactId: string,
  cursor?: string
): Promise<{ messages: WhatsAppMessage[]; nextCursor: string | null }> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  return await get(`/api/whatsapp/conversations/${contactId}/messages${qs}`)
}

export async function sendWhatsAppMessage(contactId: string, text: string): Promise<void> {
  await post(`/api/whatsapp/conversations/${contactId}/send`, { text })
}

export async function sendWhatsAppMedia(
  contactId: string,
  file: File,
  caption?: string,
): Promise<{ mediatype: string; fileName: string }> {
  const formData = new FormData()
  formData.append('file', file)
  if (caption?.trim()) formData.append('caption', caption.trim())

  const response = await fetch(`${API_BASE_URL}/api/whatsapp/conversations/${contactId}/send-media`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })

  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as Record<string, unknown>
    throw new Error((detail?.error as string) || 'Erro ao enviar mídia')
  }

  return response.json()
}

export async function markConversationRead(contactId: string): Promise<void> {
  await put(`/api/whatsapp/conversations/${contactId}/read`, {})
}

export async function listConversations(params?: {
  archived?: boolean
  tutorId?: string
  patientId?: string
  dateFrom?: string
  dateTo?: string
  labelId?: string
}): Promise<WhatsAppContact[]> {
  const qs = new URLSearchParams()
  if (params?.archived) qs.set('archived', 'true')
  if (params?.tutorId) qs.set('tutorId', params.tutorId)
  if (params?.patientId) qs.set('patientId', params.patientId)
  if (params?.dateFrom) qs.set('dateFrom', params.dateFrom)
  if (params?.dateTo) qs.set('dateTo', params.dateTo)
  if (params?.labelId) qs.set('labelId', params.labelId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return await get<WhatsAppContact[]>(`/api/whatsapp/conversations${suffix}`)
}

export async function archiveContact(contactId: string): Promise<{ archived: boolean }> {
  return await put(`/api/whatsapp/contacts/${contactId}/archive`, {})
}

export async function updateContactNotes(contactId: string, internalNotes: string | null): Promise<WhatsAppContact> {
  return await patch<WhatsAppContact>(`/api/whatsapp/contacts/${contactId}`, { internalNotes })
}

export async function listWhatsAppLabels(): Promise<WhatsAppLabel[]> {
  return await get<WhatsAppLabel[]>('/api/whatsapp/labels')
}

export async function createWhatsAppLabel(data: { name: string; color?: string }): Promise<WhatsAppLabel> {
  return await post<WhatsAppLabel>('/api/whatsapp/labels', data)
}

export async function updateWhatsAppLabel(id: string, data: { name: string; color?: string }): Promise<WhatsAppLabel> {
  return await put<WhatsAppLabel>(`/api/whatsapp/labels/${id}`, data)
}

export async function deleteWhatsAppLabel(id: string): Promise<void> {
  await del(`/api/whatsapp/labels/${id}`)
}

// Automation settings
export async function updateWhatsAppSettings(data: {
  autoReplyEnabled?: boolean
  autoReplyOutOfHours?: string | null
  autoReplyGreeting?: string | null
}): Promise<WhatsAppInstance> {
  return await put<WhatsAppInstance>('/api/whatsapp/instance/settings', data)
}

// Quick replies
export async function listQuickReplies(): Promise<WhatsAppQuickReply[]> {
  return await get<WhatsAppQuickReply[]>('/api/whatsapp/quick-replies')
}

export async function createQuickReply(data: { shortcut: string; content: string }): Promise<WhatsAppQuickReply> {
  return await post<WhatsAppQuickReply>('/api/whatsapp/quick-replies', data)
}

export async function updateQuickReply(id: string, data: { shortcut: string; content: string }): Promise<WhatsAppQuickReply> {
  return await put<WhatsAppQuickReply>(`/api/whatsapp/quick-replies/${id}`, data)
}

export async function deleteQuickReply(id: string): Promise<void> {
  await del(`/api/whatsapp/quick-replies/${id}`)
}

// Auto-responses
export async function listAutoResponses(): Promise<WhatsAppAutoResponse[]> {
  return await get<WhatsAppAutoResponse[]>('/api/whatsapp/auto-responses')
}

export async function createAutoResponse(data: { trigger: string; response: string }): Promise<WhatsAppAutoResponse> {
  return await post<WhatsAppAutoResponse>('/api/whatsapp/auto-responses', data)
}

export async function updateAutoResponse(id: string, data: { trigger: string; response: string; active?: boolean }): Promise<WhatsAppAutoResponse> {
  return await put<WhatsAppAutoResponse>(`/api/whatsapp/auto-responses/${id}`, data)
}

export async function deleteAutoResponse(id: string): Promise<void> {
  await del(`/api/whatsapp/auto-responses/${id}`)
}

export async function setContactLabels(contactId: string, labelIds: string[]): Promise<Pick<WhatsAppLabel, 'id' | 'name' | 'color'>[]> {
  return await put(`/api/whatsapp/contacts/${contactId}/labels`, { labelIds })
}

export async function startWhatsAppConversation(data: { phone: string; name?: string }): Promise<WhatsAppContact> {
  return await post<WhatsAppContact>('/api/whatsapp/conversations/start', data)
}

export async function linkTutorToContact(contactId: string, tutorId: string): Promise<WhatsAppContact> {
  return await post<WhatsAppContact>(`/api/whatsapp/contacts/${contactId}/link-tutor`, { tutorId })
}

export async function listWhatsAppContacts(q?: string): Promise<WhatsAppContact[]> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : ''
  return await get<WhatsAppContact[]>(`/api/whatsapp/contacts${qs}`)
}

export async function createPatientFromContact(
  contactId: string,
  data: {
    tutor: { name: string; phone: string; email?: string; cpf?: string; address?: string }
    patient: {
      name: string
      species: string
      breed: string
      sex: string
      birthDate: string
      weightKg: number
      color?: string
      neutered?: boolean
      allergies?: string[]
      chronicConditions?: string[]
    }
  }
): Promise<{ tutor: Tutor; patient: Patient }> {
  return await post(`/api/whatsapp/contacts/${contactId}/create-patient`, data)
}

export async function createAppointmentFromContact(
  contactId: string,
  data: Partial<Appointment>
): Promise<Appointment> {
  return await post<Appointment>(`/api/whatsapp/contacts/${contactId}/appointment`, data)
}

export async function deleteFile(id: string): Promise<void> {
  return await del<void>(`/api/files/${id}`)
}

// Upload image for rich text editor
export async function uploadRichTextImage(file: File): Promise<{ url: string }> {
  const formData = new FormData()
  formData.append('entityType', 'rich_text_image')
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })

  if (!response.ok) {
    let detail: unknown = null
    try {
      detail = await response.json()
    } catch {
      // ignore
    }
    throw new ApiError(
      `Upload failed: ${response.statusText}`,
      response.status,
      detail
    )
  }

  const result = await response.json() as FileRecord & { url: string }
  return { url: result.url }
}

// ============================================================================
// CONSULTATION DOCUMENTS (receitas, exames, termos)
// ============================================================================

export async function listConsultationDocuments(params: {
  draftId?: string
  medicalRecordId?: string
}): Promise<ConsultationDocument[]> {
  const qs = new URLSearchParams()
  if (params.draftId) qs.set('draftId', params.draftId)
  if (params.medicalRecordId) qs.set('medicalRecordId', params.medicalRecordId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return await get<ConsultationDocument[]>(`/api/consultation-documents${suffix}`)
}

export async function createConsultationDocument(
  data: CreateConsultationDocumentInput
): Promise<ConsultationDocument> {
  return await post<ConsultationDocument>('/api/consultation-documents', data)
}

export async function updateConsultationDocument(
  id: string,
  data: Partial<CreateConsultationDocumentInput>
): Promise<ConsultationDocument> {
  return await put<ConsultationDocument>(`/api/consultation-documents/${id}`, data)
}

export async function deleteConsultationDocument(id: string): Promise<void> {
  return await del<void>(`/api/consultation-documents/${id}`)
}

// ============================================================================
// DOCUMENT TEMPLATES
// ============================================================================

export async function listTemplatesByType(type: TemplateType): Promise<DocumentTemplate[]> {
  return await get<DocumentTemplate[]>(`/api/templates/type/${type}`)
}

export async function listTemplates(): Promise<DocumentTemplate[]> {
  return await get<DocumentTemplate[]>('/api/templates')
}

export async function getTemplate(id: string): Promise<DocumentTemplate> {
  return await get<DocumentTemplate>(`/api/templates/${id}`)
}

export async function createTemplate(data: {
  type: TemplateType
  name: string
  description?: string
  content: string
  variables?: string[]
  isActive?: boolean
}): Promise<DocumentTemplate> {
  return await post<DocumentTemplate>('/api/templates', data)
}

export async function updateTemplate(
  id: string,
  data: Partial<{
    type: TemplateType
    name: string
    description: string
    content: string
    variables: string[]
    isActive: boolean
  }>
): Promise<DocumentTemplate> {
  return await put<DocumentTemplate>(`/api/templates/${id}`, data)
}

export async function deleteTemplate(id: string): Promise<void> {
  return await del<void>(`/api/templates/${id}`)
}

// ============================================================================
// PERMISSIONS
// ============================================================================

import type { Permission, UserPermissionOverride, UserPermissionsResponse } from './permissions'

export async function getRolePermissionDefaults(role: string): Promise<{ role: string; defaults: Permission[] }> {
  return await get(`/api/permissions/role/${role}`)
}

export async function getUserPermissions(userTenantId: string): Promise<UserPermissionsResponse> {
  return await get(`/api/permissions/user/${userTenantId}`)
}

export async function updateUserPermissions(
  userTenantId: string,
  overrides: UserPermissionOverride[],
): Promise<{ permVersion: number; effective: Permission[] }> {
  return await put(`/api/permissions/user/${userTenantId}`, { overrides })
}

export async function getMyPermissions(): Promise<{ permissions: Permission[]; permVersion: number }> {
  return await get(`/api/permissions/me`)
}

// ============================================================================
// TEAM ADMIN
// ============================================================================

export interface AdminUserUpdate {
  email?: string
  name?: string
  password?: string
}

export interface AdminUpdatedUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  active: boolean
  createdAt: string
}

export async function adminUpdateUser(userId: string, data: AdminUserUpdate): Promise<AdminUpdatedUser> {
  return await put(`/api/users/${userId}`, data)
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

import type { AppNotification } from './types'

export async function listNotifications(): Promise<AppNotification[]> {
  try {
    return await get<AppNotification[]>('/api/notifications')
  } catch {
    return []
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  await put(`/api/notifications/${id}/read`, {})
}

export async function markAllNotificationsRead(): Promise<void> {
  await put('/api/notifications/read-all', {})
}

// ============================================================================
// WHATSAPP — ASSIGNMENT
// ============================================================================

export async function listWhatsAppTeam(): Promise<import('./types').WhatsAppTeamMember[]> {
  return get('/api/whatsapp/team')
}

export async function assignConversation(contactId: string, userId: string | null): Promise<import('./types').WhatsAppContact> {
  return put(`/api/whatsapp/contacts/${contactId}/assign`, { userId })
}

export async function getWhatsAppAnalytics(): Promise<import('./types').WhatsAppAnalytics> {
  return get('/api/whatsapp/analytics')
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export type EmailTemplate = {
  id: string
  tenantId: string
  name: string
  subject: string
  body: string
  type: 'appointment_confirmation' | 'appointment_reminder' | 'password_reset' | 'hospitalization_update' | 'financial_report' | 'surgery_reminder' | 'custom'
  variables: string[] | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type EmailLog = {
  id: string
  tenantId: string
  templateId: string | null
  to: string
  subject: string
  status: 'pending' | 'sent' | 'failed'
  error: string | null
  sentAt: string | null
  createdAt: string
  template?: {
    id: string
    name: string
    type: string
  }
}

export async function listEmailTemplates(type?: string): Promise<EmailTemplate[]> {
  const query = type ? `?type=${type}` : ''
  return get(`/api/emails/templates${query}`)
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate> {
  return get(`/api/emails/templates/${id}`)
}

export async function createEmailTemplate(data: Omit<EmailTemplate, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> {
  return post('/api/emails/templates', data)
}

export async function updateEmailTemplate(id: string, data: Partial<Omit<EmailTemplate, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>): Promise<EmailTemplate> {
  return put(`/api/emails/templates/${id}`, data)
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  return del(`/api/emails/templates/${id}`)
}

export async function listEmailLogs(limit = 50): Promise<EmailLog[]> {
  return get(`/api/emails/logs?limit=${limit}`)
}

export async function sendCustomEmail(data: { to: string; subject: string; html: string }): Promise<{ success: boolean; message: string }> {
  return post('/api/emails/send', data)
}

// ============================================================================
// IMAGE EXAMS
// ============================================================================

export async function listImageExams(filters?: {
  status?: string
  type?: string
  patientId?: string
}): Promise<ImageExam[]> {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.type) params.append('type', filters.type)
  if (filters?.patientId) params.append('patientId', filters.patientId)
  const query = params.toString() ? `?${params.toString()}` : ''
  return get<ImageExam[]>(`/api/image-exams${query}`)
}

export async function getImageExam(id: string): Promise<ImageExam | null> {
  try {
    return await get<ImageExam | null>(`/api/image-exams/${id}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }
    console.error(`Error fetching image exam ${id}:`, error)
    throw error
  }
}

export async function createImageExam(data: Partial<ImageExam>): Promise<ImageExam> {
  return post<ImageExam>('/api/image-exams', data)
}

export async function updateImageExam(id: string, data: Partial<ImageExam>): Promise<ImageExam> {
  return put<ImageExam>(`/api/image-exams/${id}`, data)
}

export async function deleteImageExam(id: string): Promise<void> {
  return del<void>(`/api/image-exams/${id}`)
}

export async function analyzeImageExam(id: string): Promise<ImageExam> {
  return post<ImageExam>(`/api/image-exams/${id}/analyze`, {})
}

export async function finalizeImageExam(id: string, data: {
  paymentAmount?: number
  paymentMethod?: string
  fichaId?: string
}): Promise<ImageExam> {
  return post<ImageExam>(`/api/image-exams/${id}/finalize`, data)
}

export async function sendTemplateEmail(data: { to: string; templateType: string; variables?: Record<string, string | number | boolean> }): Promise<{ success: boolean; message: string }> {
  return post('/api/emails/send-template', data)
}

// ============================================================================
// QUOTES (ORÇAMENTOS)
// ============================================================================

export async function listQuotes(filters?: { tutorId?: string; patientId?: string }): Promise<Quote[]> {
  const params = new URLSearchParams()
  if (filters?.tutorId) params.append('tutorId', filters.tutorId)
  if (filters?.patientId) params.append('patientId', filters.patientId)
  const query = params.toString() ? `?${params.toString()}` : ''
  return get<Quote[]>(`/api/quotes${query}`)
}

export async function createQuote(data: {
  tutorId: string
  patientId?: string
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>
  total: number
  notes?: string
  validUntil?: string
}): Promise<Quote> {
  return post<Quote>('/api/quotes', data)
}

export async function approveQuote(id: string): Promise<Quote> {
  return post<Quote>(`/api/quotes/${id}/approve`, {})
}

export async function rejectQuote(id: string): Promise<Quote> {
  return post<Quote>(`/api/quotes/${id}/reject`, {})
}

export async function deleteQuote(id: string): Promise<void> {
  return del<void>(`/api/quotes/${id}`)
}

export async function sendQuoteViaWhatsApp(
  quote: Quote,
  tutor: { id: string; name: string; phone?: string | null },
): Promise<string> {
  let contacts = await listConversations({ tutorId: tutor.id })
  let contact = contacts[0]

  if (!contact) {
    if (!tutor.phone) throw new Error('Tutor sem telefone cadastrado')
    contact = await startWhatsAppConversation({ phone: tutor.phone, name: tutor.name })
  }

  const br = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const lines: string[] = [
    `*Orçamento*`,
    '',
    `Olá, ${tutor.name}! 👋`,
    'Segue o orçamento:',
    '',
    '*Itens:*',
    ...quote.items.map(
      (i) => `• ${i.description} (${i.quantity}x) — ${br(i.unitPrice)} = *${br(i.total)}*`,
    ),
    '',
    `💰 *Total: ${br(quote.total)}*`,
  ]

  if (quote.patient?.name) lines.push(`🐾 Animal: ${quote.patient.name}`)
  if (quote.validUntil) {
    const d = new Date(quote.validUntil).toLocaleDateString('pt-BR')
    lines.push(`📅 Válido até: ${d}`)
  }
  if (quote.notes) lines.push(`📝 ${quote.notes}`)

  await sendWhatsAppMessage(contact.id, lines.join('\n'))
  return contact.id
}

// ============================================================================
// FICHAS ABERTAS (OPEN ENCOUNTERS)
// ============================================================================

export async function listFichas(filters?: { status?: string; patientId?: string }): Promise<Ficha[]> {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.patientId) params.append('patientId', filters.patientId)
  const query = params.toString() ? `?${params.toString()}` : ''
  return get<Ficha[]>(`/api/fichas${query}`)
}

export async function createFicha(data: { patientId: string; tutorId?: string; notes?: string }): Promise<Ficha> {
  return post<Ficha>('/api/fichas', data)
}

export async function getFicha(id: string): Promise<Ficha> {
  return get<Ficha>(`/api/fichas/${id}`)
}

export async function updateFicha(id: string, data: { notes?: string; status?: string }): Promise<Ficha> {
  return patch<Ficha>(`/api/fichas/${id}`, data)
}

export async function addFichaItem(fichaId: string, item: {
  type: string
  sourceId?: string
  name: string
  quantity: number
  unitPrice: number
  total: number
}): Promise<FichaItem> {
  return post<FichaItem>(`/api/fichas/${fichaId}/items`, item)
}

export async function removeFichaItem(fichaId: string, itemId: string): Promise<void> {
  return del<void>(`/api/fichas/${fichaId}/items/${itemId}`)
}

export async function fecharFicha(fichaId: string, data: { amount: number; method: string; notes?: string }): Promise<Ficha> {
  return post<Ficha>(`/api/fichas/${fichaId}/fechar`, data)
}
