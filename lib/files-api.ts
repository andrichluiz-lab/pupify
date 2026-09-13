import { get, post, del } from './api-client'

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
}

export interface UploadFileParams {
  entityType: 'patient' | 'medical_record' | 'appointment' | 'surgery' | 'hospitalization'
  entityId: string
  file: globalThis.File
}

export async function uploadFile(params: UploadFileParams): Promise<FileRecord> {
  const formData = new FormData()
  formData.append('entityType', params.entityType)
  formData.append('entityId', params.entityId)
  formData.append('file', params.file)

  const response = await post<FileRecord>('/api/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response
}

export async function getDownloadUrl(fileId: string): Promise<{ url: string }> {
  return get<{ url: string }>(`/api/files/${fileId}/download`)
}

export async function listFiles(params?: {
  entityType?: string
  entityId?: string
}): Promise<FileRecord[]> {
  const queryParams = new URLSearchParams()
  if (params?.entityType) queryParams.append('entityType', params.entityType)
  if (params?.entityId) queryParams.append('entityId', params.entityId)

  const queryString = queryParams.toString()
  const url = queryString ? `/api/files?${queryString}` : '/api/files'

  return get<FileRecord[]>(url)
}

export async function deleteFile(fileId: string): Promise<void> {
  return del(`/api/files/${fileId}`)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export function isPdf(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}
