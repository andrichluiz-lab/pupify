import { prisma } from '../prisma.js'

/**
 * Get patient context for AI (simplified RAG without embeddings)
 * Returns relevant history: allergies, chronic conditions, recent medical records
 */
export async function getPatientContext(
  patientId: string | null,
  tenantId: string
): Promise<string> {
  if (!patientId) {
    return ''
  }

  try {
    // Get patient data
    const patient = await prisma.patient.findUnique({
      where: { id: patientId, tenantId },
      select: {
        name: true,
        allergies: true,
        chronicConditions: true,
        birthDate: true,
        weightKg: true,
      },
    })

    if (!patient) {
      return ''
    }

    const contextParts: string[] = []

    // Patient basic info
    const age = calculateAge(patient.birthDate)
    contextParts.push(`Paciente: ${patient.name}, ${age}, ${patient.weightKg}kg`)

    // Allergies
    if (patient.allergies && patient.allergies.length > 0) {
      contextParts.push(`Alergias: ${patient.allergies.join(', ')}`)
    }

    // Chronic conditions
    if (patient.chronicConditions && patient.chronicConditions.length > 0) {
      contextParts.push(`Condições crônicas: ${patient.chronicConditions.join(', ')}`)
    }

    // Recent medical records (last 5)
    const recentRecords = await prisma.medicalRecord.findMany({
      where: { patientId, tenantId },
      include: { soap: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    if (recentRecords.length > 0) {
      contextParts.push('\nConsultas anteriores:')
      for (const record of recentRecords) {
        const date = new Date(record.createdAt).toLocaleDateString('pt-BR')
        contextParts.push(`- ${date}: ${record.chiefComplaint}`)
        if (record.soap) {
          if (record.soap.assessment) {
            contextParts.push(`  Avaliação: ${record.soap.assessment}`)
          }
          if (record.soap.plan) {
            contextParts.push(`  Plano: ${record.soap.plan}`)
          }
        }
      }
    }

    return contextParts.join('\n')
  } catch (error) {
    console.error('Error fetching patient context:', error)
    return ''
  }
}

function calculateAge(birthDate: Date): string {
  const now = new Date()
  const birth = new Date(birthDate)
  const years = now.getFullYear() - birth.getFullYear()
  const months = now.getMonth() - birth.getMonth()

  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    return `${years - 1} anos`
  }

  return `${years} anos`
}
