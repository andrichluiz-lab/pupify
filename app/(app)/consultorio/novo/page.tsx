import { ConsultaEditor } from "@/components/consultorio/consulta-editor"

interface Props {
  searchParams: Promise<{ patientId?: string }>
}

export default async function NovaConsultaPage({ searchParams }: Props) {
  const { patientId } = await searchParams
  return <ConsultaEditor initialDraftId={null} initialPatientId={patientId ?? null} />
}
