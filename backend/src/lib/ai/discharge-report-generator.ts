import { prisma } from '../prisma.js'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY environment variable is required')

export interface DischargeReportResult {
  report: string
  instructions: string[]
}

export async function generateDischargeReport(
  hospitalizationId: string,
  tenantId: string,
): Promise<DischargeReportResult> {
  const hosp = await prisma.hospitalization.findFirst({
    where: { id: hospitalizationId, tenantId },
    include: {
      patient: {
        select: { name: true, species: true, birthDate: true, weightKg: true, allergies: true },
      },
      veterinarian: { select: { name: true } },
      vitals: { orderBy: { updatedAt: 'desc' }, take: 10 },
      orders: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!hosp) throw new Error('Hospitalization not found')

  const age = hosp.patient.birthDate
    ? `${new Date().getFullYear() - new Date(hosp.patient.birthDate).getFullYear()} ano(s)`
    : 'desconhecida'

  const admittedAt = new Date(hosp.admittedAt).toLocaleDateString('pt-BR')
  const dischargedAt = hosp.dischargedAt
    ? new Date(hosp.dischargedAt).toLocaleDateString('pt-BR')
    : 'ainda internado'

  const lines: string[] = [
    `Paciente: ${hosp.patient.name}, ${hosp.patient.species}, ${age}, ${hosp.patient.weightKg}kg`,
    `Médico responsável: ${hosp.veterinarian.name}`,
    `Motivo da internação: ${hosp.reason}`,
    `Período: ${admittedAt} a ${dischargedAt}`,
    `Status atual: ${hosp.status}`,
    hosp.patient.allergies.length ? `Alergias: ${hosp.patient.allergies.join(', ')}` : null,
    hosp.painLevel != null ? `Nível de dor: ${hosp.painLevel}/5` : null,
    hosp.dietNotes ? `Dieta: ${hosp.dietNotes}` : null,
  ].filter(Boolean) as string[]

  if (hosp.vitals.length) {
    lines.push('\nÚltimos sinais vitais:')
    for (const v of hosp.vitals.slice(0, 5)) {
      const d = new Date(v.updatedAt).toLocaleString('pt-BR')
      const parts = [
        v.temperature != null ? `T: ${v.temperature}°C` : null,
        v.heartRate != null ? `FC: ${v.heartRate}bpm` : null,
        v.respiratoryRate != null ? `FR: ${v.respiratoryRate}irpm` : null,
        v.bloodPressure ? `PA: ${v.bloodPressure}` : null,
        v.oxygenSaturation != null ? `SpO₂: ${v.oxygenSaturation}%` : null,
      ].filter(Boolean)
      if (parts.length) lines.push(`- ${d}: ${parts.join(' | ')}`)
    }
  }

  if (hosp.orders.length) {
    lines.push('\nOrdens terapêuticas:')
    for (const o of hosp.orders) {
      const done = o.done ? '✓' : '○'
      lines.push(`${done} ${o.drug} ${o.dose} — ${o.route} (${o.time})`.trim())
    }
  }

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
            'Você é um veterinário redigindo um relatório de alta hospitalar. Com base nos dados da internação, gere um JSON com dois campos: "report" (string — relatório de alta completo e profissional em português, incluindo: identificação, motivo de internação, resumo da evolução clínica, procedimentos e medicamentos realizados, condição de alta) e "instructions" (array de strings — orientações ao tutor, máximo 6 itens práticos e objetivos). Retorne APENAS o JSON, sem markdown.',
        },
        {
          role: 'user',
          content: lines.join('\n'),
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
    report: typeof parsed.report === 'string' ? parsed.report : '',
    instructions: Array.isArray(parsed.instructions) ? parsed.instructions : [],
  }
}
