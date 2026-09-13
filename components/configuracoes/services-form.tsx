"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { createService, deleteService } from "@/lib/api"
import { getErrorMessage } from "@/lib/api-client"
import type { Service } from "@/lib/api"

interface ServicesFormProps {
  services: Service[]
}

export function ServicesForm({ services }: ServicesFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    price: "",
    durationMin: "30",
    category: "",
  })
  const { toast } = useToast()

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault()
    if (!newService.name || !newService.price) return

    const price = parseFloat(newService.price)
    const durationMin = parseInt(newService.durationMin)

    if (isNaN(price) || price <= 0) {
      toast({
        variant: "destructive",
        title: "Preço inválido",
        description: "Digite um valor válido para o preço.",
      })
      return
    }

    if (isNaN(durationMin) || durationMin <= 0) {
      toast({
        variant: "destructive",
        title: "Duração inválida",
        description: "Digite um valor válido para a duração.",
      })
      return
    }

    setIsLoading(true)
    try {
      await createService({
        name: newService.name,
        description: newService.description || undefined,
        price,
        durationMin,
        category: newService.category || undefined,
      })
      
      setNewService({
        name: "",
        description: "",
        price: "",
        durationMin: "30",
        category: "",
      })
      
      toast({
        title: "Serviço adicionado",
        description: "O serviço foi adicionado com sucesso.",
      })
      
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar serviço",
        description: getErrorMessage(error),
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteService(serviceId: string) {
    setIsLoading(true)
    try {
      await deleteService(serviceId)
      toast({
        title: "Serviço removido",
        description: "O serviço foi removido com sucesso.",
      })
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao remover serviço",
        description: getErrorMessage(error),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">Serviços</h2>
      </div>
      
      <div className="p-4">
        {/* Add new service form */}
        <form onSubmit={handleAddService} className="mb-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="serviceName">Nome do serviço *</Label>
              <Input
                id="serviceName"
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                placeholder="Consulta geral"
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="servicePrice">Preço (R$) *</Label>
              <Input
                id="servicePrice"
                type="number"
                step="0.01"
                value={newService.price}
                onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                placeholder="150.00"
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="serviceDuration">Duração (minutos)</Label>
              <Input
                id="serviceDuration"
                type="number"
                value={newService.durationMin}
                onChange={(e) => setNewService({ ...newService, durationMin: e.target.value })}
                placeholder="30"
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="serviceCategory">Categoria</Label>
              <Input
                id="serviceCategory"
                value={newService.category}
                onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                placeholder="Consulta"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="serviceDescription">Descrição</Label>
            <Input
              id="serviceDescription"
              value={newService.description}
              onChange={(e) => setNewService({ ...newService, description: e.target.value })}
              placeholder="Descrição do serviço"
              disabled={isLoading}
            />
          </div>

          <Button type="submit" size="sm" className="h-8 gap-1.5" disabled={isLoading}>
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
            Adicionar serviço
          </Button>
        </form>

        {/* Services list */}
        {services.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhum serviço cadastrado
          </div>
        ) : (
          <div className="space-y-2">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium truncate">{service.name}</h3>
                    {service.category && (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {service.category}
                      </span>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{service.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>R$ {service.price != null ? service.price.toFixed(2) : "0.00"}</span>
                    {service.durationMin != null && (
                      <>
                        <span>•</span>
                        <span>{service.durationMin} min</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteService(service.id)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
