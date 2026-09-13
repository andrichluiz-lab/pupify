"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, Trash2, FileText, Image as ImageIcon, File } from "lucide-react"

interface Attachment {
  id: string
  name: string
  type: "image" | "document" | "other"
  url: string
  size?: number
  uploadedAt: Date
}

interface AttachmentsEditorProps {
  attachments: Attachment[]
  onChange: (attachments: Attachment[]) => void
}

export function AttachmentsEditor({ attachments, onChange }: AttachmentsEditorProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)

    try {
      // Simulate upload - in production, this would upload to S3 or similar
      for (const file of files) {
        const type = file.type.startsWith("image/")
          ? "image"
          : file.type === "application/pdf"
          ? "document"
          : "other"

        const attachment: Attachment = {
          id: crypto.randomUUID(),
          name: file.name,
          type,
          url: URL.createObjectURL(file), // In production, this would be the S3 URL
          size: file.size,
          uploadedAt: new Date(),
        }

        onChange([...attachments, attachment])
      }
    } catch (error) {
      console.error("Error uploading files:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteAttachment = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id))
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getIcon = (type: Attachment["type"]) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-4 w-4" strokeWidth={1.75} />
      case "document":
        return <FileText className="h-4 w-4" strokeWidth={1.75} />
      default:
        return <File className="h-4 w-4" strokeWidth={1.75} />
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Anexos</h3>
        <span className="text-xs text-muted-foreground">{attachments.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
              {getIcon(attachment.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.size)}
                </span>
                <span className="text-xs text-muted-foreground">
                  · {new Date(attachment.uploadedAt).toLocaleString("pt-BR")}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleDeleteAttachment(attachment.id)}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="file"
          id="file-upload"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx"
        />
        <label htmlFor="file-upload">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={isUploading}
            asChild
          >
            <span>
              <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
              {isUploading ? "Enviando..." : "Adicionar anexos"}
            </span>
          </Button>
        </label>
        <span className="text-xs text-muted-foreground">
          Imagens, PDF, DOC
        </span>
      </div>
    </div>
  )
}
