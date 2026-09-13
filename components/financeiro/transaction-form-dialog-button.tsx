"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { TransactionFormDialog } from "./transaction-form-dialog"
import type { FinancialTransaction } from "@/lib/types"

interface TransactionFormDialogButtonProps {
  children: ReactNode
  onSave: (data: Partial<FinancialTransaction>) => Promise<void>
  initialData?: Partial<FinancialTransaction>
  defaultDirection?: "entrada" | "saida"
  buttonVariant?: "default" | "outline" | "ghost" | "destructive" | "link"
  buttonSize?: "default" | "sm" | "lg" | "icon"
}

export function TransactionFormDialogButton({
  children,
  onSave,
  initialData,
  defaultDirection = "entrada",
  buttonVariant = "default",
  buttonSize = "default",
}: TransactionFormDialogButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant={buttonVariant}
        size={buttonSize}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>
      <TransactionFormDialog
        open={open}
        onOpenChange={setOpen}
        onSave={onSave}
        initialData={initialData}
        defaultDirection={defaultDirection}
      />
    </>
  )
}
