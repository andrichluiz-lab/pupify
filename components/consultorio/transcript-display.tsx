import { FileText } from 'lucide-react'
import type { TranscriptSegment } from '@/hooks/use-audio-recorder'

interface TranscriptDisplayProps {
  transcript: TranscriptSegment[]
  isRecording?: boolean
}

export function TranscriptDisplay({ transcript, isRecording = false }: TranscriptDisplayProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Transcrição ao vivo</h3>
          {isRecording && (
            <span className="inline-flex items-center gap-1 text-xs text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              gravando...
            </span>
          )}
        </div>
        <button type="button" className="text-xs text-muted-foreground hover:text-foreground">
          Copiar texto
        </button>
      </div>
      <div className="min-h-[180px] rounded-md bg-muted/40 p-4 text-sm leading-relaxed text-foreground">
        {transcript.length === 0 ? (
          <p className="text-muted-foreground">
            A transcrição aparecerá aqui conforme você fala. Descreva a queixa, exame físico e conduta
            naturalmente — a IA cuida da estrutura.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {transcript.map((segment, index) => {
              const time = index * 15 // Approximate time based on segments
              return (
                <p key={index} className="text-pretty">
                  <span className="text-muted-foreground">[{formatTime(time)}]</span>{' '}
                  <span className="font-medium">
                    {segment.speaker === 'veterinario' ? 'Veterinário' : 'Tutor'}:
                  </span>{' '}
                  {segment.text}
                  {isRecording && index === transcript.length - 1 && (
                    <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-primary align-middle" />
                  )}
                </p>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
