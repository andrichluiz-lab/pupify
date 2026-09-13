import nodemailer from 'nodemailer'
import { prisma } from './prisma.js'

interface EmailOptions {
  to: string
  subject: string
  html: string
  tenantId: string
  templateId?: string
}

interface TemplateVariables {
  [key: string]: string | number | boolean
}

// Create transporter with Google SMTP
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD

  if (!user || !pass) {
    console.warn('SMTP credentials not configured. Email sending will be disabled.')
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: {
      user,
      pass,
    },
  })
}

// Replace variables in template
const renderTemplate = (template: string, variables: TemplateVariables): string => {
  let rendered = template
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    rendered = rendered.replace(regex, String(value))
  }
  return rendered
}

// Log email to database
const logEmail = async (
  tenantId: string,
  templateId: string | undefined,
  to: string,
  subject: string,
  status: 'pending' | 'sent' | 'failed',
  error?: string
) => {
  try {
    await prisma.emailLog.create({
      data: {
        tenantId,
        templateId,
        to,
        subject,
        status,
        error,
        sentAt: status === 'sent' ? new Date() : null,
      },
    })
  } catch (err) {
    console.error('Failed to log email:', err)
  }
}

// Send email
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  const transporter = createTransporter()
  
  if (!transporter) {
    await logEmail(
      options.tenantId,
      options.templateId,
      options.to,
      options.subject,
      'failed',
      'SMTP not configured'
    )
    return false
  }

  const from = process.env.EMAIL_FROM || 'noreply@pupify.com'
  const fromName = process.env.EMAIL_FROM_NAME || 'Pupify'

  try {
    await logEmail(
      options.tenantId,
      options.templateId,
      options.to,
      options.subject,
      'pending'
    )

    await transporter.sendMail({
      from: `"${fromName}" <${from}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })

    await logEmail(
      options.tenantId,
      options.templateId,
      options.to,
      options.subject,
      'sent'
    )

    return true
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Failed to send email:', errorMessage)
    
    await logEmail(
      options.tenantId,
      options.templateId,
      options.to,
      options.subject,
      'failed',
      errorMessage
    )

    return false
  }
}

// Send email using template
export const sendTemplateEmail = async (
  tenantId: string,
  templateType: string,
  to: string,
  variables: TemplateVariables
): Promise<boolean> => {
  try {
    // Find active template for this tenant and type
    const template = await prisma.emailTemplate.findFirst({
      where: {
        tenantId,
        type: templateType as any,
        active: true,
      },
    })

    if (!template) {
      console.warn(`No active template found for type ${templateType} in tenant ${tenantId}`)
      return false
    }

    // Render template with variables
    const subject = renderTemplate(template.subject, variables)
    const html = renderTemplate(template.body, variables)

    // Send email
    return await sendEmail({
      to,
      subject,
      html,
      tenantId,
      templateId: template.id,
    })
  } catch (error) {
    console.error('Failed to send template email:', error)
    return false
  }
}

// Get email logs for tenant
export const getEmailLogs = async (tenantId: string, limit = 50) => {
  return prisma.emailLog.findMany({
    where: { tenantId },
    include: {
      template: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
