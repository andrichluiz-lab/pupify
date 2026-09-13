const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

if (!OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required')
}

export interface SOAPNote {
  subjective: string[]
  objective: string[]
  assessment: string[]
  plan: string[]
}

export interface SOAPGenerationRequest {
  transcript: Array<{ speaker: string; text: string }>
  patientName: string
  tutorName: string
  specialty?: string
  patientHistory?: string
}

/**
 * Generate SOAP note using OpenRouter/Gemini 2.5 Flash
 */
export async function generateSOAP(
  request: SOAPGenerationRequest
): Promise<SOAPNote> {
  const { transcript, patientName, tutorName, specialty = 'generalista', patientHistory = '' } =
    request

  if (!transcript || transcript.length === 0) {
    throw new Error('No transcript provided')
  }

  const transcriptText = transcript
    .map(
      (t) =>
        `[${t.speaker === 'veterinario' ? 'Veterinário' : 'Tutor'}]: ${t.text}`
    )
    .join('\n')

  // Add patient history context if available
  const historyBlock = patientHistory?.trim()
    ? `

HISTÓRICO RELEVANTE DESTE PACIENTE (use apenas como contexto; não invente dados que não estejam na transcrição atual):
${patientHistory}`
    : ''

  try {
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
            content: `Você é um assistente veterinário especializado em estruturar consultas no formato SOAP.
Analise a transcrição da consulta e extraia informações relevantes para cada seção do SOAP.
Seja preciso e baseie-se APENAS no que foi dito na transcrição. Não invente informações.
Retorne o resultado em formato JSON puro com a seguinte estrutura:
{
  "subjective": ["ponto 1", "ponto 2", ...],
  "objective": ["ponto 1", "ponto 2", ...],
  "assessment": ["diagnóstico/hipótese 1", "diagnóstico/hipótese 2", ...],
  "plan": ["ação 1", "ação 2", ...]
}
Cada array deve conter itens concisos e específicos.` + historyBlock,
          },
          {
            role: 'user',
            content: `PACIENTE: ${patientName}
TUTOR: ${tutorName}
ESPECIALIDADE: ${specialty}

Transcrição da consulta:
${transcriptText}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('SOAP generation error:', response.status, errorBody)
      throw new Error('Failed to generate SOAP')
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content || ''
    const trimmed = content.trim()

    try {
      const cleanJson = trimmed
        .replace(/```json?\n?/g, '')
        .replace(/```/g, '')
        .trim()
      const parsed = JSON.parse(cleanJson) as SOAPNote
      return parsed
    } catch {
      console.warn('Could not parse SOAP JSON:', trimmed)
      return {
        subjective: [],
        objective: [],
        assessment: [],
        plan: [],
      }
    }
  } catch (error) {
    console.error('SOAP generation error:', error)
    throw new Error('Failed to generate SOAP')
  }
}
