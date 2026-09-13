"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteImageExam } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Eye, Pencil, Trash2 } from "lucide-react"

interface ExamActionsProps {
  examId: string
  onDelete?: () => void
}

export function ExamActions({ examId, onDelete }: ExamActionsProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleEdit = () => {
    router.push(`/exames-imagens/novo?id=${examId}`)
  }

  const handleView = () => {
    router.push(`/exames-imagens/novo?id=${examId}`)
  }

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      await deleteImageExam(examId)
      setDeleteDialogOpen(false)
      onDelete?.()
    } catch (error) {
      console.error("Error deleting exam:", error)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleView}
        >
          <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleEdit}
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={handleDeleteClick}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Button>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este exame? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
