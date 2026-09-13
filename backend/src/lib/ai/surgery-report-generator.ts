import { prisma } from '../prisma.js'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY environment variable is required')

export async function generateSurgeryReport(surgeryId: string, tenantId: string): Promise<string> {
  const surgery = await prisma.surgery.findFirst({
    where: { id: surgeryId, tenantId },
    include: {
      patient: { select: { name: true, species: true, birthDate: true, weightKg: true } },
      veterinarian: { select: { name: true } },
    },
  })

  if (!surgery) throw new Error('Surgery not found')

  const age = surgery.patient.birthDate
    ? `${new Date().getFullYear() - new Date(surgery.patient.birthDate).getFullYear()} ano(s)`
    : 'desconhecida'

  const lines = [
    `Procedimento: ${surgery.procedure}`,
    `Paciente: ${surgery.patient.name}, ${surgery.patient.species}, ${age}, ${surgery.patient.weightKg}kg`,
    `Cirurgião: ${surgery.surgeon}`,
    surgery.anesthetist ? `Anestesista: ${surgery.anesthetist}` : null,
    surgery.assistant ? `Auxiliar: ${surgery.assistant}` : null,
    `Data/hora: ${new Date(surgery.scheduledFor).toLocaleString('pt-BR')}`,
    `Duração estimada: ${surgery.estimatedDurationMin} min`,
    `Sala: ${surgery.room}`,
    `Risco: ${surgery.risk}`,
    surgery.notes ? `Observações pré-op: ${surgery.notes}` : null,
    surgery.surgeryNotes ? `Notas cirúrgicas: ${surgery.surgeryNotes}` : null,
    surgery.anesthesiaNotes ? `Notas anestésicas: ${surgery.anesthesiaNotes}` : null,
  ].filter(Boolean).join('\n')

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
            'Você é um veterinário redigindo um laudo cirúrgico formal. Com base nos dados fornecidos, gere um laudo cirúrgico completo e profissional em português. Inclua: identificação do paciente, descrição do procedimento, técnica utilizada (se mencionada), achados transoperatórios (se mencionados), anestesia utilizada (se mencionada), intercorrências (se houver) e considerações finais. Use linguagem técnica veterinária adequada. Retorne APENAS o texto do laudo, sem markdown, sem títulos extras.',
        },
        {
          role: 'user',
          content: lines,
        },
      ],
    }),
  })

  if (!response.ok) throw new Error(`OpenRouter error: ${response.statusText}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await response.json() as any
  return data.choices?.[0]?.message?.content?.trim() ?? ''
}
