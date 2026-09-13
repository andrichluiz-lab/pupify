import { PacientesHeader } from "./pacientes-header"
import { PacientesClient } from "./pacientes-client"
import { listTutors } from "@/lib/api"

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>
}) {
  const tutors = await listTutors()
  const params = await searchParams
  const sortOrder = params.sort || "name"

  const sorted = [...tutors].sort((a, b) => {
    if (sortOrder === "name")    return a.name.localeCompare(b.name)
    if (sortOrder === "recent")  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (sortOrder === "animals") return b.patientsCount - a.patientsCount
    return 0
  })

  const totalAnimals = tutors.reduce((sum, t) => sum + t.patientsCount, 0)

  return (
    <>
      <PacientesHeader totalTutors={tutors.length} totalAnimals={totalAnimals} />
      <main className="flex flex-col gap-4 p-4 md:p-6">
        <PacientesClient tutors={sorted} sortOrder={sortOrder} />
      </main>
    </>
  )
}
