const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY environment variable is required')

export interface PrescriptionSuggestion {
  drug: string
  dose: string
  frequency: string
  duration: string
  route: string
  notes?: string
}

interface SOAPInput {
  subjective?: string | string[]
  objective?: string | string[]
  assessment?: string | string[]
  plan?: string | string[]
}

function soapToText(soap: SOAPInput): string {
  const join = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v.join('. ') : (v ?? '')
  return [
    `Subjetivo: ${join(soap.subjective)}`,
    `Objetivo: ${join(soap.objective)}`,
    `Avaliação: ${join(soap.assessment)}`,
    `Plano: ${join(soap.plan)}`,
  ]
    .filter((l) => !l.endsWith(': '))
    .join('\n')
}

export async function suggestPrescriptions(
  soap: SOAPInput,
  patientContext: string,
): Promise<PrescriptionSuggestion[]> {
  const userContent = `${patientContext}\n\nSOAP da consulta:\n${soapToText(soap)}`

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
            'Você é um veterinário sugerindo prescrições com base em uma consulta. Com base no SOAP e no contexto do paciente, sugira de 1 a 5 prescrições veterinárias. NUNCA sugira medicamentos aos quais o paciente tem alergia. Retorne APENAS um array JSON com objetos no formato: { "drug": string, "dose": string, "frequency": string, "duration": string, "route": string, "notes": string (opcional) }. Sem markdown, sem texto extra.',
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
    }),
  })

  if (!response.ok) throw new Error(`OpenRouter error: ${response.statusText}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await response.json() as any
  const content = data.choices?.[0]?.message?.content || '[]'
  const clean = content.trim().replace(/```json?\n?/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(clean)
  return Array.isArray(parsed) ? parsed : []
}
