import { Sparkles } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

interface SOAPData {
  subjective: string[]
  objective: string[]
  assessment: string[]
  plan: string[]
}

interface SOAPEditorProps {
  soap: SOAPData | null
  onChange: (soap: SOAPData) => void
  disabled?: boolean
}

export function SOAPEditor({ soap, onChange, disabled = false }: SOAPEditorProps) {
  const handleFieldChange = (field: keyof SOAPData, value: string) => {
    const updated = {
      ...soap,
      [field]: value.split('\n').filter(line => line.trim()),
    } as SOAPData
    onChange(updated)
  }

  const getFieldDisplay = (field: keyof SOAPData) => {
    if (!soap) return ''
    return Array.isArray(soap[field]) ? (soap[field] as string[]).join('\n') : soap[field] as string
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" strokeWidth={2} />
          <h3 className="text-sm font-semibold">SOAP gerado pela IA</h3>
        </div>
        <span className="text-xs text-muted-foreground">Editável</span>
      </div>

      <SOAPField
        letter="S"
        label="Subjetivo"
        placeholder="Queixas e informações relatadas pelo tutor..."
        value={getFieldDisplay('subjective')}
        disabled={disabled}
        onChange={(value) => handleFieldChange('subjective', value)}
      />
      <SOAPField
        letter="O"
        label="Objetivo"
        placeholder="Dados do exame físico, sinais vitais, peso..."
        value={getFieldDisplay('objective')}
        disabled={disabled}
        onChange={(value) => handleFieldChange('objective', value)}
      />
      <SOAPField
        letter="A"
        label="Avaliação"
        placeholder="Diagnóstico ou hipóteses diagnósticas..."
        value={getFieldDisplay('assessment')}
        disabled={disabled}
        onChange={(value) => handleFieldChange('assessment', value)}
      />
      <SOAPField
        letter="P"
        label="Plano"
        placeholder="Conduta, medicações, exames solicitados, retorno..."
        value={getFieldDisplay('plan')}
        disabled={disabled}
        onChange={(value) => handleFieldChange('plan', value)}
      />
    </div>
  )
}

function SOAPField({
  letter,
  label,
  placeholder,
  value,
  disabled,
  onChange,
}: {
  letter: string
  label: string
  placeholder: string
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-xs font-semibold text-muted-foreground">
        {letter}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={value ? 4 : 2}
          className="resize-none"
        />
      </div>
    </div>
  )
}
