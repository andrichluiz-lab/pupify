import { prisma } from '../prisma.js'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY environment variable is required')

export interface TutorInstructions {
  greeting: string
  instructions: string[]
  followUp: string | null
}

export async function generateTutorInstructions(
  draftId: string,
  tenantId: string,
): Promise<TutorInstructions> {
  const draft = await prisma.consultationDraft.findFirst({
    where: { id: draftId, tenantId },
  })

  if (!draft) throw new Error('Draft not found')

  const soap = draft.soapJson as Record<string, string | string[]> | null
  const join = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v.join('. ') : (v ?? '')

  const lines = [
    `Paciente: ${draft.patientName}`,
    `Tutor: ${draft.tutorName}`,
    draft.finalReport ? `Queixa principal: ${draft.finalReport}` : null,
    soap?.assessment ? `Avaliação: ${join(soap.assessment)}` : null,
    soap?.plan ? `Plano de tratamento: ${join(soap.plan)}` : null,
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
            'Você é um veterinário redigindo orientações pós-consulta para o tutor do animal. Com base nos dados da consulta, gere um JSON com três campos: "greeting" (string — saudação personalizada de 1 frase incluindo o nome do tutor e do pet), "instructions" (array de 3 a 6 strings — orientações práticas e claras para o tutor em linguagem simples, sem jargão técnico; inclua cuidados, como administrar medicamentos, sinais de alerta para retornar à clínica) e "followUp" (string ou null — quando retornar, se aplicável). Retorne APENAS o JSON, sem markdown.',
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
  const content = data.choices?.[0]?.message?.content || '{}'
  const clean = content.trim().replace(/```json?\n?/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(clean)

  return {
    greeting: typeof parsed.greeting === 'string' ? parsed.greeting : '',
    instructions: Array.isArray(parsed.instructions) ? parsed.instructions : [],
    followUp: typeof parsed.followUp === 'string' ? parsed.followUp : null,
  }
}
