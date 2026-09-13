"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AppTopbar } from "@/components/app-topbar"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save } from "lucide-react"
import type { CreateTeamMemberInput } from "@/lib/types"

const ROLES = [
  { value: "CLINIC_ADMIN", label: "Administrador" },
  { value: "VETERINARIAN", label: "Veterinário" },
  { value: "RECEPTIONIST", label: "Recepcionista" },
  { value: "TECHNICIAN", label: "Técnico" },
]

export default function NovoMembroPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CreateTeamMemberInput>({
    name: "",
    email: "",
    password: "",
    role: "RECEPTIONIST",
    crmv: "",
    specialty: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { createTeamMemberAction } = await import("../actions")
    const result = await createTeamMemberAction(formData)
    
    if (result.success) {
      router.push("/equipe")
    } else {
      alert(result.error || "Erro ao criar membro da equipe")
    }
    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <>
      <AppTopbar
        title="Adicionar membro"
        description="Cadastre um novo membro para a equipe"
        action={{
          label: "Voltar",
          href: "/equipe",
        }}
      />

      <main className="flex flex-col gap-6 p-4 md:p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Dados pessoais */}
          <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
            <h2 className="text-sm font-medium">Dados pessoais</h2>
            
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-xs font-medium text-muted-foreground">
                Nome completo *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                E-mail *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Ex: joao@exemplo.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                Senha *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </section>

          {/* Cargo */}
          <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
            <h2 className="text-sm font-medium">Cargo e permissões</h2>
            
            <div className="flex flex-col gap-2">
              <label htmlFor="role" className="text-xs font-medium text-muted-foreground">
                Cargo *
              </label>
              <select
                id="role"
                name="role"
                required
                value={formData.role}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            {formData.role === "VETERINARIAN" && (
              <>
                <div className="flex flex-col gap-2">
                  <label htmlFor="crmv" className="text-xs font-medium text-muted-foreground">
                    CRMV *
                  </label>
                  <input
                    type="text"
                    id="crmv"
                    name="crmv"
                    required={formData.role === "VETERINARIAN"}
                    value={formData.crmv}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Ex: CRMV-SP 12345"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="specialty" className="text-xs font-medium text-muted-foreground">
                    Especialidade
                  </label>
                  <input
                    type="text"
                    id="specialty"
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Ex: Clínica Geral, Cirurgia, etc."
                  />
                </div>
              </>
            )}
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/equipe")}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Salvando..." : "Salvar membro"}
            </Button>
          </div>
        </form>
      </main>
    </>
  )
}
