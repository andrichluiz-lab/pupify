/**
 * Seeds default email templates for all tenants.
 * Idempotent: safe to run multiple times.
 *
 * Run via: npx tsx prisma/seed-email-templates.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_TEMPLATES = [
  {
    type: 'appointment_confirmation' as const,
    name: 'Confirmação de Agendamento',
    subject: 'Confirmação de Agendamento - {{clinicName}}',
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4F46E5; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Agendamento Confirmado</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>{{tutorName}}</strong>!</p>
      <p>Informamos que o agendamento para <strong>{{patientName}}</strong> foi confirmado com sucesso.</p>
      
      <div class="info-box">
        <p><strong>Tipo:</strong> {{appointmentType}}</p>
        <p><strong>Data:</strong> {{appointmentDate}}</p>
        <p><strong>Horário:</strong> {{appointmentTime}}</p>
      </div>
      
      <p>Por favor, chegue com 15 minutos de antecedência.</p>
      <p>Em caso de impossibilidade de comparecer, entre em contato conosco para reagendar.</p>
      
      <p>Atenciosamente,<br><strong>{{clinicName}}</strong></p>
    </div>
    <div class="footer">
      <p>Este email foi enviado automaticamente. Não responda.</p>
    </div>
  </div>
</body>
</html>`,
    variables: ['patientName', 'tutorName', 'appointmentDate', 'appointmentTime', 'appointmentType', 'clinicName'],
  },
  {
    type: 'appointment_reminder' as const,
    name: 'Lembrete de Agendamento',
    subject: 'Lembrete: Agendamento amanhã - {{clinicName}}',
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Lembrete de Agendamento</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>{{tutorName}}</strong>!</p>
      <p>Lembrete: <strong>{{patientName}}</strong> tem um agendamento amanhã.</p>
      
      <div class="info-box">
        <p><strong>Data:</strong> {{appointmentDate}}</p>
        <p><strong>Horário:</strong> {{appointmentTime}}</p>
      </div>
      
      <p>Por favor, chegue com 15 minutos de antecedência.</p>
      <p>Em caso de impossibilidade de comparecer, entre em contato conosco o mais rápido possível.</p>
      
      <p>Atenciosamente,<br><strong>{{clinicName}}</strong></p>
    </div>
    <div class="footer">
      <p>Este email foi enviado automaticamente. Não responda.</p>
    </div>
  </div>
</body>
</html>`,
    variables: ['patientName', 'tutorName', 'appointmentDate', 'appointmentTime', 'clinicName'],
  },
  {
    type: 'password_reset' as const,
    name: 'Recuperação de Senha',
    subject: 'Recuperação de Senha - {{clinicName}}',
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Recuperação de Senha</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>{{userName}}</strong>!</p>
      <p>Recebemos uma solicitação de recuperação de senha para sua conta no <strong>{{clinicName}}</strong>.</p>
      
      <p>Clique no botão abaixo para redefinir sua senha:</p>
      
      <div style="text-align: center;">
        <a href="{{resetLink}}" class="button">Redefinir Senha</a>
      </div>
      
      <p>Se você não solicitou esta recuperação, ignore este email.</p>
      <p>Este link expira em 1 hora.</p>
      
      <p>Atenciosamente,<br><strong>{{clinicName}}</strong></p>
    </div>
    <div class="footer">
      <p>Este email foi enviado automaticamente. Não responda.</p>
    </div>
  </div>
</body>
</html>`,
    variables: ['userName', 'resetLink', 'clinicName'],
  },
  {
    type: 'hospitalization_update' as const,
    name: 'Atualização de Internação',
    subject: 'Atualização: Internação de {{patientName}} - {{clinicName}}',
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 Atualização de Internação</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>{{tutorName}}</strong>!</p>
      <p>Informamos sobre uma atualização na internação de <strong>{{patientName}}</strong>.</p>
      
      <div class="info-box">
        <p><strong>Status Atual:</strong> {{status}}</p>
        <p><strong>Veterinário Responsável:</strong> {{veterinarianName}}</p>
      </div>
      
      <p>Estamos monitorando constantemente o estado de saúde do seu pet.</p>
      <p>Em caso de dúvidas, entre em contato conosco.</p>
      
      <p>Atenciosamente,<br><strong>{{clinicName}}</strong></p>
    </div>
    <div class="footer">
      <p>Este email foi enviado automaticamente. Não responda.</p>
    </div>
  </div>
</body>
</html>`,
    variables: ['patientName', 'tutorName', 'status', 'veterinarianName', 'clinicName'],
  },
  {
    type: 'financial_report' as const,
    name: 'Relatório Financeiro',
    subject: 'Relatório Financeiro - {{clinicName}}',
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6366F1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .revenue { color: #10B981; font-weight: bold; }
    .expense { color: #EF4444; font-weight: bold; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório Financeiro</h1>
    </div>
    <div class="content">
      <p>Olá!</p>
      <p>Abaixo segue o resumo financeiro do período <strong>{{period}}</strong>.</p>
      
      <div class="info-box">
        <p><strong>Total de Receitas:</strong> <span class="revenue">{{totalRevenue}}</span></p>
        <p><strong>Total de Despesas:</strong> <span class="expense">{{totalExpenses}}</span></p>
      </div>
      
      <p>Para mais detalhes, acesse o sistema.</p>
      
      <p>Atenciosamente,<br><strong>{{clinicName}}</strong></p>
    </div>
    <div class="footer">
      <p>Este email foi enviado automaticamente. Não responda.</p>
    </div>
  </div>
</body>
</html>`,
    variables: ['clinicName', 'period', 'totalRevenue', 'totalExpenses'],
  },
  {
    type: 'surgery_reminder' as const,
    name: 'Lembrete de Cirurgia',
    subject: 'Lembrete: Cirurgia agendada - {{clinicName}}',
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #8B5CF6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B5CF6; }
    .warning-box { background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 Lembrete de Cirurgia</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>{{tutorName}}</strong>!</p>
      <p>Lembrete: <strong>{{patientName}}</strong> tem uma cirurgia agendada.</p>
      
      <div class="info-box">
        <p><strong>Procedimento:</strong> {{procedure}}</p>
        <p><strong>Data:</strong> {{surgeryDate}}</p>
        <p><strong>Horário:</strong> {{surgeryTime}}</p>
      </div>
      
      <div class="warning-box">
        <p><strong>⚠️ Importante:</strong></p>
        <ul>
          <li>O animal deve ficar em jejum de 8 a 12 horas antes da cirurgia</li>
          <li>Traze os documentos e exames recentes</li>
          <li>Chegue com 30 minutos de antecedência</li>
        </ul>
      </div>
      
      <p>Em caso de dúvidas, entre em contato conosco.</p>
      
      <p>Atenciosamente,<br><strong>{{clinicName}}</strong></p>
    </div>
    <div class="footer">
      <p>Este email foi enviado automaticamente. Não responda.</p>
    </div>
  </div>
</body>
</html>`,
    variables: ['patientName', 'tutorName', 'surgeryDate', 'surgeryTime', 'procedure', 'clinicName'],
  },
]

async function main() {
  console.log('🌱 Seeding email templates...')

  const tenants = await prisma.tenant.findMany({
    where: { active: true },
  })

  let created = 0
  let skipped = 0

  for (const tenant of tenants) {
    for (const template of DEFAULT_TEMPLATES) {
      const existing = await prisma.emailTemplate.findFirst({
        where: {
          tenantId: tenant.id,
          type: template.type,
        },
      })

      if (existing) {
        skipped++
        continue
      }

      await prisma.emailTemplate.create({
        data: {
          tenantId: tenant.id,
          name: template.name,
          subject: template.subject,
          body: template.body,
          type: template.type,
          variables: template.variables,
          active: true,
        },
      })

      created++
    }
  }

  console.log(`✅ Created ${created} email templates for ${tenants.length} tenants`)
  console.log(`⏭️  Skipped ${skipped} existing templates`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
