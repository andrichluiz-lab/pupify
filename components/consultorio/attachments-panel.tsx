"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Paperclip, Trash2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  uploadFile,
  listFiles,
  deleteFile,
  getFileDownloadUrl,
} from "@/lib/api"
import type { FileRecord } from "@/lib/types"

interface Props {
  draftId: string
}

export function AttachmentsPanel({ draftId }: Props) {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const refresh = async () => {
    try {
      const list = await listFiles({ entityType: "consultation_draft", entityId: draftId })
      setFiles(list)
    } catch (error) {
      console.error("Error listing files:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId])

  const handlePick = () => inputRef.current?.click()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploading(true)
    try {
      await uploadFile(file, "consultation_draft", draftId)
      toast({ title: "Anexo enviado" })
      await refresh()
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        variant: "destructive",
        title: "Erro ao enviar arquivo",
        description: error instanceof Error ? error.message : "Tente novamente.",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (id: string) => {
    try {
      const { url } = await getFileDownloadUrl(id)
      window.open(url, "_blank", "noopener")
    } catch (error) {
      console.error("Download error:", error)
      toast({ variant: "destructive", title: "Erro ao gerar link de download" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir anexo?")) return
    try {
      await deleteFile(id)
      await refresh()
    } catch (error) {
      console.error("Delete error:", error)
      toast({ variant: "destructive", title: "Erro ao excluir anexo" })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Anexos</h3>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePick} disabled={uploading}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
          Enviar arquivo
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf,text/plain"
          onChange={handleUpload}
        />
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum anexo.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{f.originalName}</span>
                <span className="text-xs text-muted-foreground">
                  {(f.sizeBytes / 1024).toFixed(0)} KB · {f.mimeType}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDownload(f.id)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Baixar"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(f.id)}
                className="rounded p-1 text-muted-foreground hover:text-destructive"
                aria-label="Excluir"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
