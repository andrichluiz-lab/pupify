"use client"

import { useState, useCallback } from 'react'
import { Upload, X, FileImage, FileText, Download, Trash2 } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'
import { uploadFile, deleteFile, getDownloadUrl, type FileRecord, formatFileSize, isImage, isPdf } from '@/lib/files-api'

interface FileUploadProps {
  entityType: 'patient' | 'medical_record' | 'appointment' | 'surgery' | 'hospitalization'
  entityId: string
  existingFiles?: FileRecord[]
  onFileUploaded?: (file: FileRecord) => void
  onFileDeleted?: (fileId: string) => void
  maxFiles?: number
  accept?: string
}

export function FileUpload({
  entityType,
  entityId,
  existingFiles = [],
  onFileUploaded,
  onFileDeleted,
  maxFiles = 10,
  accept = 'image/*,.pdf',
}: FileUploadProps) {
  const [files, setFiles] = useState<FileRecord[]>(existingFiles)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFiles(e.dataTransfer.files)
    }
  }, [entityType, entityId])

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      await handleFiles(e.target.files)
    }
  }

  const handleFiles = async (fileList: FileList) => {
    if (files.length >= maxFiles) {
      alert(`Máximo de ${maxFiles} arquivos permitidos`)
      return
    }

    const file = fileList[0]
    setUploading(true)

    try {
      const uploadedFile = await uploadFile({
        entityType,
        entityId,
        file,
      })
      setFiles((prev) => [...prev, uploadedFile])
      onFileUploaded?.(uploadedFile)
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      alert('Erro ao fazer upload do arquivo')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (fileId: string) => {
    try {
      await deleteFile(fileId)
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      onFileDeleted?.(fileId)
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error)
      alert('Erro ao deletar arquivo')
    }
  }

  const handleDownload = async (fileId: string) => {
    try {
      const { url } = await getDownloadUrl(fileId)
      window.open(url, '_blank')
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error)
      alert('Erro ao baixar arquivo')
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (isImage(mimeType)) return <FileImage className="h-4 w-4" strokeWidth={1.75} />
    if (isPdf(mimeType)) return <FileText className="h-4 w-4" strokeWidth={1.75} />
    return <FileText className="h-4 w-4" strokeWidth={1.75} />
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50",
          uploading && "pointer-events-none opacity-50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleChange}
          accept={accept}
          disabled={uploading || files.length >= maxFiles}
        />
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center gap-2 cursor-pointer"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Upload className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              {uploading ? 'Fazendo upload...' : 'Arraste e solte ou clique para selecionar'}
            </p>
            <p className="text-xs text-muted-foreground">
              Máximo {maxFiles} arquivos • Máximo 10MB por arquivo
            </p>
          </div>
        </label>
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Arquivos ({files.length}/{maxFiles})
          </h3>
          <ul className="divide-y divide-border">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/40"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  {getFileIcon(file.mimeType)}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-sm font-medium">{file.originalName}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.sizeBytes)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(file.id)}
                  >
                    <Download className="h-4 w-4" strokeWidth={1.75} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(file.id)}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
