import { prisma } from '../prisma.js'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY environment variable is required')

export interface DailyReportResult {
  summary: string
  highlights: string[]
  alerts: string[]
  feedback: string
  stats: {
    total: number
    completed: number
    cancelled: number
    byType: Record<string, number>
  }
}

export async function generateDailyReport(
  tenantId: string,
  date: string,
): Promise<DailyReportResult> {
  const [year, month, day] = date.split('-').map(Number)
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)

  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      startsAt: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      patient: { select: { name: true, species: true } },
      tutor: { select: { name: true } },
      veterinarian: { select: { name: true } },
    },
    orderBy: { startsAt: 'asc' },
  })

  const stats = {
    total: appointments.length,
    completed: appointments.filter(a => a.status === 'concluido').length,
    cancelled: appointments.filter(a => a.status === 'cancelado' || a.status === 'falta').length,
    byType: appointments.reduce<Record<string, number>>((acc, a) => {
      acc[a.type] = (acc[a.type] ?? 0) + 1
      return acc
    }, {}),
  }

  const typeLabel: Record<string, string> = {
    consulta: 'Consulta', retorno: 'Retorno', vacina: 'Vacina',
    cirurgia: 'Cirurgia', exame: 'Exame', banho_tosa: 'Banho & Tosa', emergencia: 'Emergência',
  }

  const statusLabel: Record<string, string> = {
    agendado: 'agendado', confirmado: 'confirmado', em_atendimento: 'em atendimento',
    concluido: 'concluído', cancelado: 'cancelado', falta: 'falta',
  }

  const lines: string[] = [
    `Data: ${new Date(startOfDay).toLocaleDateString('pt-BR')}`,
    `Total de agendamentos: ${stats.total}`,
    `Concluídos: ${stats.completed} | Cancelados/Faltas: ${stats.cancelled}`,
    `Distribuição por tipo: ${Object.entries(stats.byType)
      .map(([t, n]) => `${typeLabel[t] ?? t}: ${n}`)
      .join(', ')}`,
    '',
    'Agenda do dia:',
    ...appointments.map(a => {
      const time = new Date(a.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      return `- ${time} | ${typeLabel[a.type] ?? a.type} | ${a.patient.name} (${a.patient.species}) | Vet: ${a.veterinarian.name} | Status: ${statusLabel[a.status] ?? a.status}${a.notes ? ` | Notas: ${a.notes}` : ''}`
    }),
  ]

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
          content: `Você é um gestor clínico veterinário. Analise a agenda do dia e gere um relatório executivo em JSON com:
- "summary": string — parágrafo de 2-3 frases resumindo o dia (volume, produtividade, destaques gerais)
- "highlights": array de strings — até 4 observações positivas ou notáveis do dia (ex: alta taxa de conclusão, tipo de atendimento predominante, paciente recorrente, etc.)
- "alerts": array de strings — até 3 alertas ou pontos de atenção (ex: faltas acima do normal, cancelamentos, casos de emergência, carga desequilibrada entre veterinários)
- "feedback": string — 1-2 frases de feedback construtivo para a equipe ou gestão

Se não houver atendimentos, indique isso no summary e deixe os arrays vazios. Retorne APENAS o JSON, sem markdown.`,
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
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
    alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
    feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
    stats,
  }
}
