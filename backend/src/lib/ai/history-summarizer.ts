import { prisma } from '../prisma.js'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY environment variable is required')

export interface HistorySummary {
  bullets: string[]
  lastVisit: string | null
  alerts: string[]
}

export async function summarizePatientHistory(
  patientId: string,
  tenantId: string,
): Promise<HistorySummary> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId, tenantId },
    select: {
      name: true,
      species: true,
      birthDate: true,
      weightKg: true,
      allergies: true,
      chronicConditions: true,
      medicalRecords: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { soap: true },
      },
      imageExams: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { type: true, aiReport: true, createdAt: true },
      },
      surgeries: {
        orderBy: { scheduledFor: 'desc' },
        take: 3,
        select: { procedure: true, scheduledFor: true, status: true },
      },
    },
  })

  if (!patient) throw new Error('Patient not found')

  const lastVisitDate = patient.medicalRecords[0]?.createdAt ?? null
  const lastVisit = lastVisitDate
    ? new Date(lastVisitDate).toLocaleDateString('pt-BR')
    : null

  const age = calcAge(patient.birthDate)
  const lines: string[] = [`Paciente: ${patient.name}, ${age}, ${patient.weightKg}kg`]

  if (patient.allergies.length) lines.push(`Alergias: ${patient.allergies.join(', ')}`)
  if (patient.chronicConditions.length) lines.push(`Condições crônicas: ${patient.chronicConditions.join(', ')}`)

  if (patient.medicalRecords.length) {
    lines.push('\nÚltimas consultas:')
    for (const r of patient.medicalRecords) {
      const d = new Date(r.createdAt).toLocaleDateString('pt-BR')
      lines.push(`- ${d}: ${r.chiefComplaint}`)
      if (r.soap?.assessment) lines.push(`  Avaliação: ${r.soap.assessment}`)
      if (r.soap?.plan) lines.push(`  Plano: ${r.soap.plan}`)
    }
  }

  if (patient.imageExams.length) {
    lines.push('\nExames de imagem recentes:')
    for (const e of patient.imageExams) {
      const d = new Date(e.createdAt).toLocaleDateString('pt-BR')
      lines.push(`- ${d}: ${e.type}${e.aiReport ? ` — ${e.aiReport.slice(0, 120)}…` : ''}`)
    }
  }

  if (patient.surgeries.length) {
    lines.push('\nCirurgias:')
    for (const s of patient.surgeries) {
      const d = new Date(s.scheduledFor).toLocaleDateString('pt-BR')
      lines.push(`- ${d}: ${s.procedure} (${s.status})`)
    }
  }

  const historyText = lines.join('\n')

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'Você é um veterinário revisando o prontuário antes de uma consulta. Com base no histórico do paciente, retorne um JSON com dois campos: "bullets" (array de até 5 strings — pontos clínicos mais relevantes, em português, direto ao ponto) e "alerts" (array de strings — alertas urgentes como alergias ativas, condições críticas ou medicamentos em uso que o veterinário DEVE saber antes de tratar; pode ser vazio). Retorne APENAS o JSON, sem markdown.',
        },
        {
          role: 'user',
          content: historyText,
        },
      ],
    }),
  })

  if (!response.ok) throw new Error(`OpenRouter error: ${response.statusText}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await response.json() as any
  const content = data.choices?.[0]?.message?.content || '{}'
  const clean = content.trim().replace(/```json?\n?/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(clean)

  return {
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
    alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
    lastVisit,
  }
}

function calcAge(birthDate: Date): string {
  const now = new Date()
  const birth = new Date(birthDate)
  let years = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--
  if (years < 1) {
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + m
    return `${Math.max(months, 1)} mês(es)`
  }
  return `${years} ano(s)`
}
