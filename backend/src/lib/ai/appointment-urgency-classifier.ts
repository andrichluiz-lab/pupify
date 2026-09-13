const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY environment variable is required')

export type UrgencyLevel = 'eletiva' | 'urgente' | 'emergencia'

export interface UrgencyResult {
  level: UrgencyLevel
  reason: string
}

export async function classifyAppointmentUrgency(
  notes: string,
  appointmentType: string,
  patientSpecies?: string,
): Promise<UrgencyResult> {
  const context = [
    `Tipo de atendimento: ${appointmentType}`,
    patientSpecies ? `Espécie: ${patientSpecies}` : null,
    `Motivo/observações: ${notes}`,
  ]
    .filter(Boolean)
    .join('\n')

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
            'Você é um triagista veterinário. Com base no motivo do agendamento, classifique a urgência em: "eletiva" (consulta de rotina, vacinação, retorno programado), "urgente" (sintomas preocupantes mas estáveis, deve ser atendido no dia) ou "emergencia" (risco de vida imediato, sangramento, convulsão, dificuldade respiratória grave, trauma). Retorne APENAS um JSON com: { "level": "eletiva" | "urgente" | "emergencia", "reason": "justificativa em 1 frase em português" }. Sem markdown.',
        },
        {
          role: 'user',
          content: context,
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

  const validLevels: UrgencyLevel[] = ['eletiva', 'urgente', 'emergencia']
  const level: UrgencyLevel = validLevels.includes(parsed.level) ? parsed.level : 'eletiva'

  return { level, reason: typeof parsed.reason === 'string' ? parsed.reason : '' }
}
