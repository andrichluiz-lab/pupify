import cron from 'node-cron'
import { prisma } from './prisma.js'
import * as evo from './evolution-client.js'

const TYPE_LABELS: Record<string, string> = {
  consulta: 'consulta',
  retorno: 'retorno',
  vacina: 'vacinação',
  cirurgia: 'cirurgia',
  exame: 'exame',
  banho_tosa: 'banho e tosa',
  emergencia: 'emergência',
}

function applyReminderVars(
  template: string,
  opts: { nome: string; telefone: string; paciente: string; data: string; hora: string; tipo: string },
): string {
  return template
    .replace(/\{\{nome\}\}/gi, opts.nome)
    .replace(/\{\{telefone\}\}/gi, opts.telefone)
    .replace(/\{\{paciente\}\}/gi, opts.paciente)
    .replace(/\{\{data\}\}/gi, opts.data)
    .replace(/\{\{hora\}\}/gi, opts.hora)
    .replace(/\{\{tipo\}\}/gi, opts.tipo)
}

const DEFAULT_REMINDER =
  'Olá {{nome}}! 🐾 Lembramos que {{paciente}} tem uma consulta de *{{tipo}}* agendada para *{{data}}* às *{{hora}}*.\n\nResponda *1* para confirmar ou *2* para cancelar.'

export async function sendAppointmentReminders(): Promise<void> {
  const instances = await prisma.whatsAppInstance.findMany({
    where: { status: 'connected', instanceToken: { not: null } },
  })

  const now = new Date()
  // Remind appointments starting in the 23h–25h window (2-hour band around the 24h mark)
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const windowEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  for (const instance of instances) {
    const { tenantId } = instance

    const reminderQR = await prisma.whatsAppQuickReply.findFirst({
      where: { tenantId, shortcut: 'lembrete' },
    })
    const template = reminderQR?.content ?? DEFAULT_REMINDER

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        status: { in: ['agendado', 'confirmado'] },
        startsAt: { gte: windowStart, lte: windowEnd },
        whatsappReminderSentAt: null,
      },
      include: { tutor: true, patient: true },
    })

    for (const appt of appointments) {
      if (!appt.tutor) continue

      const contact = await prisma.whatsAppContact.findFirst({
        where: { tenantId, tutorId: appt.tutorId },
      })
      if (!contact) continue

      const dateStr = appt.startsAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      const timeStr = appt.startsAt.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      })

      const message = applyReminderVars(template, {
        nome:     appt.tutor.name,
        telefone: contact.phone,
        paciente: appt.patient?.name ?? 'seu pet',
        data:     dateStr,
        hora:     timeStr,
        tipo:     TYPE_LABELS[appt.type] ?? appt.type,
      })

      try {
        await evo.sendTextMessage(instance.instanceToken!, contact.lid || contact.jid, message)
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { whatsappReminderSentAt: now },
        })
      } catch (err) {
        console.error(`[WhatsApp scheduler] Failed to send reminder for appointment ${appt.id}:`, err)
      }
    }
  }
}

export function startWhatsAppScheduler(): void {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    sendAppointmentReminders().catch((err) =>
      console.error('[WhatsApp scheduler] Unhandled error:', err)
    )
  })
  console.log('[WhatsApp scheduler] Started — appointment reminders every 15 min')
}
