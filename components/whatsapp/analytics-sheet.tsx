'use client'

import { useState, useCallback } from 'react'
import { BarChart2, Loader2, MessageCircle, MessageSquare, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { getWhatsAppAnalytics } from '@/lib/api'
import type { WhatsAppAnalytics } from '@/lib/types'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  image: 'Imagem',
  audio: 'Áudio',
  video: 'Vídeo',
  document: 'Documento',
}

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType
  label: string
  value: number
  sub?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-lg font-semibold tabular-nums">{value.toLocaleString('pt-BR')}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

function MiniBar({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  // Show only every 5th label to avoid crowding
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-0.5 h-32">
        {data.map((d, i) => (
          <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end h-full">
            <div
              className="w-full rounded-sm bg-primary/70 hover:bg-primary transition-colors"
              style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 4 : 0)}%` }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10">
              <div className="rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background whitespace-nowrap">
                {format(new Date(d.date), 'd MMM', { locale: ptBR })}: {d.count}
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* X-axis: show only week boundaries */}
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{format(new Date(data[0].date), 'd MMM', { locale: ptBR })}</span>
        <span>{format(new Date(data[14].date), 'd MMM', { locale: ptBR })}</span>
        <span>{format(new Date(data[29].date), 'd MMM', { locale: ptBR })}</span>
      </div>
    </div>
  )
}

export function WhatsAppAnalyticsSheet() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<WhatsAppAnalytics | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (data) return  // already loaded for this session
    setLoading(true)
    try {
      setData(await getWhatsAppAnalytics())
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [data])

  const handleOpen = (v: boolean) => {
    setOpen(v)
    if (v) load()
  }

  const totalMessages = data ? data.sentCount + data.receivedCount : 0

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Relatórios">
          <BarChart2 className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        <SheetHeader className="px-4 pt-4 pb-4">
          <SheetTitle>Relatórios WhatsApp</SheetTitle>
        </SheetHeader>

        <div className="px-4">

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && !data && (
          <p className="text-sm text-muted-foreground">Falha ao carregar dados.</p>
        )}

        {data && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={Users}
                label="Conversas totais"
                value={data.totalConversations}
              />
              <StatCard
                icon={TrendingUp}
                label="Ativas (7 dias)"
                value={data.activeConversations}
              />
              <StatCard
                icon={MessageSquare}
                label="Mensagens enviadas"
                value={data.sentCount}
                sub="últimos 30 dias"
              />
              <StatCard
                icon={MessageCircle}
                label="Mensagens recebidas"
                value={data.receivedCount}
                sub="últimos 30 dias"
              />
            </div>

            {/* Daily bar chart */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Mensagens por dia — últimos 30 dias
              </p>
              <MiniBar data={data.messagesPerDay} />
              <p className="text-right text-xs text-muted-foreground">
                Total: {totalMessages.toLocaleString('pt-BR')} mensagens
              </p>
            </div>

            {/* By type */}
            {data.messagesByType.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Por tipo de mensagem
                </p>
                <div className="space-y-1.5">
                  {data.messagesByType
                    .sort((a, b) => b.count - a.count)
                    .map(({ type, count }) => {
                      const pct = totalMessages > 0 ? Math.round((count / totalMessages) * 100) : 0
                      return (
                        <div key={type} className="flex items-center gap-2">
                          <span className="w-20 shrink-0 text-xs capitalize text-muted-foreground">
                            {TYPE_LABELS[type] ?? type}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/70"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                            {pct}%
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => { setData(null); load() }}
            >
              Atualizar dados
            </Button>
          </div>
        )}
        </div>
        <div className="pb-4" />
      </SheetContent>
    </Sheet>
  )
}
