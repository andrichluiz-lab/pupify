import cron from 'node-cron'
import { prisma } from './prisma.js'
import { sendTemplateEmail } from './email-service.js'

// Check for appointments that need reminders every hour
export const startEmailScheduler = () => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('Checking for appointment reminders...')
      
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      
      const endOfTomorrow = new Date(tomorrow)
      endOfTomorrow.setDate(endOfTomorrow.getDate() + 1)
      
      // Find appointments for tomorrow that haven't had email reminders sent
      const appointments = await prisma.appointment.findMany({
        where: {
          startsAt: {
            gte: tomorrow,
            lt: endOfTomorrow,
          },
          status: {
            in: ['agendado', 'confirmado'],
          },
          emailReminderSentAt: null,
        },
        include: {
          patient: {
            include: {
              tutor: true,
            },
          },
          tutor: true,
          tenant: true,
        },
      })
      
      console.log(`Found ${appointments.length} appointments needing email reminders`)
      
      for (const appointment of appointments) {
        if (!appointment.tutor.email) {
          console.log(`Tutor ${appointment.tutor.name} has no email, skipping reminder`)
          continue
        }
        
        const startsAt = new Date(appointment.startsAt)
        const dateStr = startsAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const timeStr = startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        
        const success = await sendTemplateEmail(
          appointment.tenantId,
          'appointment_reminder',
          appointment.tutor.email,
          {
            patientName: appointment.patient.name,
            tutorName: appointment.tutor.name,
            appointmentDate: dateStr,
            appointmentTime: timeStr,
            clinicName: appointment.tenant.name,
          }
        )
        
        if (success) {
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { emailReminderSentAt: now },
          })
          console.log(`Email reminder sent to ${appointment.tutor.email} for appointment ${appointment.id}`)
        } else {
          console.error(`Failed to send email reminder to ${appointment.tutor.email}`)
        }
      }
    } catch (error) {
      console.error('Error in email scheduler:', error)
    }
  })
  
  console.log('Email scheduler started')
}
