const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

if (!OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required')
}

export interface TranscriptSegment {
  speaker: 'veterinario' | 'tutor'
  text: string
}

export interface TranscriptionRequest {
  audioBase64: string
  mimeType?: string
  elapsedSeconds?: number
  recentTranscript?: TranscriptSegment[]
  patientContext?: string
}

export interface TranscriptionResponse {
  segments: TranscriptSegment[]
  elapsedSeconds: number
}

/**
 * Transcribe audio using OpenRouter/Gemini 2.5 Flash
 */
export async function transcribeAudio(request: TranscriptionRequest): Promise<TranscriptionResponse> {
  const {
    audioBase64,
    mimeType = 'audio/webm',
    elapsedSeconds = 0,
    recentTranscript = [],
    patientContext = '',
  } = request

  if (!audioBase64) {
    throw new Error('No audio data provided')
  }

  // Remove data URI prefix if present
  const cleanBase64 = audioBase64.includes('base64,')
    ? audioBase64.split('base64,')[1]
    : audioBase64

  // Build context from recent transcript to avoid repetition
  const contextString =
    recentTranscript.length > 0
      ? `\nCONTEXTO DO QUE JÁ FOI TRANSCRITO (NÃO REPITA ISSO A MENOS QUE SEJA DITO NOVAMENTE NO CLIPE ATUAL):\n${recentTranscript
          .map((t) => `${t.speaker === 'veterinario' ? 'Veterinário' : 'Tutor'}: ${t.text}`)
          .join('\n')}`
      : ''

  // Add patient context if available
  const patientContextBlock = patientContext?.trim()
    ? `\n\nCONTEXTO DO PRONTUÁRIO DESTE PACIENTE (ajuda a reconhecer nomes de medicamentos/condições; NÃO invente falas a partir disso):\n${patientContext.slice(
        0,
        1500
      )}`
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
            content: `Você é um sistema de transcrição Speech-to-Text (ASR) ultra-preciso para clínicas veterinárias.
Sua ÚNICA função é extrair palavras faladas do áudio fornecido de forma literal.

⚠️ REGRAS CRÍTICAS DE SEGURANÇA ⚠️
1. NUNCA continue conversas, nunca responda aos falantes, nunca gere diálogos fictícios.
2. É ESTRITAMENTE PROIBIDO inventar falas. Se o áudio for silêncio ou ruído, retorne {"segments":[]}.
3. NÃO REPITA frases do contexto anterior se elas não aparecerem no áudio atual.
4. Se você ouvir apenas uma palavra solta ou ruído ininteligível, descarte.
5. Se o áudio estiver vazio, retorne {"segments":[]}. Não tente "prever" o que será dito.
${patientContextBlock}

${contextString}

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON PURO):
{"segments":[{"speaker":"veterinario" | "tutor","text":"texto exato dito"}]}

Para "speaker", use "veterinario" se parecer o profissional, ou "tutor" se parecer o cliente.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcreva este áudio curto. Se não houver voz humana nítida falando algo NOVO, retorne {"segments":[]}.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${cleanBase64}`,
                },
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('Gemini transcription error:', response.status, errorBody)
      throw new Error('Transcription failed')
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content || ''
    const trimmed = content.trim()

    let segments: TranscriptSegment[] = []

    try {
      const cleanJson = trimmed
        .replace(/```json?\n?/g, '')
        .replace(/```/g, '')
        .trim()
      const parsed = JSON.parse(cleanJson)
      segments = parsed.segments || []
    } catch {
      // If not valid JSON but has text, use as single segment
      if (trimmed.length > 0 && trimmed !== '[]' && !trimmed.includes('segments')) {
        segments = [{ speaker: 'veterinario', text: trimmed }]
      }
    }

    // Filter: remove empty segments and suspicious duplicates
    segments = segments.filter((s) => {
      if (!s.text || s.text.trim().length === 0) return false

      // Deduplication: if the EXACT text was just said in the last 2 segments,
      // and it's a relatively long sentence, it's likely a hallucination/loop.
      const isExactRepeat = recentTranscript
        .slice(-2)
        .some(
          (t) =>
            t.text.trim().toLowerCase() === s.text.trim().toLowerCase() && t.text.length > 10
        )

      if (isExactRepeat) return false

      return true
    })

    return { segments, elapsedSeconds }
  } catch (error) {
    console.error('Transcription error:', error)
    throw new Error('Failed to transcribe audio')
  }
}
