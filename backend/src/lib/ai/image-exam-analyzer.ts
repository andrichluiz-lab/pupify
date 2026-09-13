import { GetObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from '../s3.js'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const BUCKET_NAME = process.env.B2_BUCKET_NAME

if (!OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required')
}

export interface FileRef {
  fileKey: string
  fileBucket: string
  fileMimeType: string
}

export interface ImageExamAnalysisRequest {
  files: FileRef[]
  patientName: string
  patientSpecies: string
  examType: string
}

export interface ImageExamAnalysisResponse {
  extractedText: string
  aiAnalysis: {
    findings: string[]
    diagnosis?: string[]
    recommendations?: string[]
  }
  aiReport: string
}

async function downloadFromS3(bucket: string, key: string): Promise<Buffer> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  const response = await s3Client.send(command)

  if (!response.Body) {
    throw new Error('Arquivo vazio retornado pelo S3')
  }

  const chunks: Uint8Array[] = []
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

function isImageMime(mimeType: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)
}

export async function analyzeImageExam(
  request: ImageExamAnalysisRequest
): Promise<ImageExamAnalysisResponse> {
  const { files, patientName, patientSpecies, examType } = request

  if (files.length === 0) {
    throw new Error('Nenhum arquivo para analisar')
  }

  const systemPrompt = `Você é um médico veterinário especializado em diagnóstico por imagem e laudos laboratoriais.
Analise ${files.length > 1 ? 'os arquivos enviados' : 'o arquivo enviado'} (${examType}) do paciente ${patientName} (${patientSpecies}).

Retorne SOMENTE um JSON válido com esta estrutura exata:
{
  "extractedText": "texto extraído ou transcrito do documento",
  "aiAnalysis": {
    "findings": ["achado clínico 1", "achado clínico 2"],
    "diagnosis": ["hipótese diagnóstica 1", "hipótese diagnóstica 2"],
    "recommendations": ["recomendação 1", "recomendação 2"]
  },
  "aiReport": "laudo completo e estruturado em linguagem profissional veterinária"
}

Seja preciso, técnico e baseie-se exclusivamente no conteúdo visual/textual do(s) arquivo(s).`

  // Build content blocks for all files
  const userContent: object[] = []

  for (const fileRef of files) {
    const { fileKey, fileBucket, fileMimeType } = fileRef

    if (!isImageMime(fileMimeType) && fileMimeType !== 'application/pdf') {
      throw new Error(`Tipo de arquivo não suportado para análise: ${fileMimeType}`)
    }

    const fileBuffer = await downloadFromS3(fileBucket || BUCKET_NAME!, fileKey)
    const base64 = fileBuffer.toString('base64')
    const dataUrl = `data:${fileMimeType};base64,${base64}`

    userContent.push({
      type: 'image_url',
      image_url: { url: dataUrl },
    })
  }

  userContent.push({
    type: 'text',
    text: `Paciente: ${patientName}\nEspécie: ${patientSpecies}\nTipo de exame: ${examType}\n\nAnalise ${files.length > 1 ? `estes ${files.length} arquivos` : 'este arquivo'} e gere o laudo veterinário.`,
  })

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
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Gemini analysis error:', response.status, errorBody)
    throw new Error(`Falha na análise da IA: ${response.status}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content || ''

  try {
    const cleanJson = content
      .trim()
      .replace(/^```json?\n?/m, '')
      .replace(/```$/m, '')
      .trim()
    return JSON.parse(cleanJson) as ImageExamAnalysisResponse
  } catch {
    console.warn('Could not parse analysis JSON, returning raw content')
    return {
      extractedText: content,
      aiAnalysis: {
        findings: ['Não foi possível estruturar os achados automaticamente'],
        diagnosis: [],
        recommendations: ['Revise o laudo gerado abaixo'],
      },
      aiReport: content,
    }
  }
}
