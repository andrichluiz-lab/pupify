"use client"

import { useState } from "react"
import { AppTopbar } from "@/components/app-topbar"
import { NewPatientDialog } from "@/components/pacientes/new-patient-dialog"

type Props = {
  totalTutors: number
  totalAnimals: number
}

export function PacientesHeader({ totalTutors, totalAnimals }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <AppTopbar
        title="Clientes"
        description={`${totalTutors} tutores · ${totalAnimals} animais`}
        action={{ label: "Novo cliente", onClick: () => setOpen(true) }}
      />
      <NewPatientDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
