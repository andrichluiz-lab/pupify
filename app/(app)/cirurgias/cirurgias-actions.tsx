"use client"

interface CirurgiasActionsProps {
  children: (actions: {
    handleDelete: (id: string) => Promise<void>
  }) => React.ReactNode
}

export function CirurgiasActions({ children }: CirurgiasActionsProps) {
  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta cirurgia?")) {
      return
    }

    const { deleteSurgeryAction } = await import("./actions")
    const result = await deleteSurgeryAction(id)

    if (result.success) {
      window.location.reload()
    }
  }

  return (
    <>
      {children({ handleDelete })}
    </>
  )
}
