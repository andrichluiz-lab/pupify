import type { Patient } from '@/lib/types'

interface PatientContextCardProps {
  patient: Patient | null
}

export function PatientContextCard({ patient }: PatientContextCardProps) {
  if (!patient) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Contexto do paciente</h3>
        <p className="text-sm text-muted-foreground">Selecione um paciente para ver o contexto.</p>
      </div>
    )
  }

  const age = calculateAge(patient.birthDate)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold">Contexto do paciente</h3>
      <dl className="flex flex-col gap-2 text-sm">
        <ContextRow label="Espécie" value={`${patient.species} · ${patient.breed}`} />
        <ContextRow label="Idade" value={`${age} · ${patient.sex === 'M' ? 'Macho' : 'Fêmea'}${patient.neutered ? ' castrado' : ''}`} />
        <ContextRow label="Peso" value={`${patient.weightKg} kg`} />
        {patient.allergies && patient.allergies.length > 0 && (
          <ContextRow label="Alergias" value={patient.allergies.join(', ')} highlight />
        )}
        {patient.chronicConditions && patient.chronicConditions.length > 0 && (
          <ContextRow label="Condições crônicas" value={patient.chronicConditions.join(', ')} />
        )}
      </dl>
    </div>
  )
}

function ContextRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          highlight
            ? 'inline-flex items-center rounded border border-destructive/20 bg-destructive/5 px-1.5 py-0.5 text-xs font-medium text-destructive'
            : 'text-xs font-medium text-foreground'
        }
      >
        {value}
      </dd>
    </div>
  )
}

function calculateAge(birthDate: string): string {
  const now = new Date()
  const birth = new Date(birthDate)
  const years = now.getFullYear() - birth.getFullYear()
  const months = now.getMonth() - birth.getMonth()

  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    return `${years - 1} anos`
  }

  return `${years} anos`
}
