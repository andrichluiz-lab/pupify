'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, MessageCircle, Archive, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { WhatsAppContact, WhatsAppLabel } from '@/lib/types'

import { NewConversationModal } from './new-conversation-modal'

export interface ConversationFilters {
  archived: boolean
  labelId: string
}

interface Props {
  contacts: WhatsAppContact[]
  selectedId: string | null
  onSelect: (contact: WhatsAppContact) => void
  search: string
  onSearchChange: (value: string) => void
  filters: ConversationFilters
  onFiltersChange: (f: ConversationFilters) => void
  labels: WhatsAppLabel[]
  onNewConversation?: (contact: WhatsAppContact) => void
}

export function ConversationList({
  contacts,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  labels,
  onNewConversation,
}: Props) {
  const [filterOpen, setFilterOpen] = useState(false)

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.tutor?.name.toLowerCase().includes(q)
    )
  })

  const hasActiveFilter = filters.labelId !== ''

  return (
    <div className="flex h-full flex-col border-r border-border">
      {/* Search row */}
      <div className="p-3 pb-2 flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>

        {/* Filter popover */}
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={hasActiveFilter ? 'default' : 'outline'}
              size="icon"
              className="shrink-0"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3 space-y-3" align="end">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filtrar por etiqueta</p>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => onFiltersChange({ ...filters, labelId: '' })}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-muted/50',
                  filters.labelId === '' && 'bg-accent font-medium'
                )}
              >
                Todas
              </button>
              {labels.map((label) => (
                <button
                  key={label.id}
                  onClick={() => onFiltersChange({ ...filters, labelId: label.id })}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-muted/50',
                    filters.labelId === label.id && 'bg-accent font-medium'
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                </button>
              ))}
              {labels.length === 0 && (
                <p className="text-xs text-muted-foreground px-2">Nenhuma etiqueta criada</p>
              )}
            </div>
            {hasActiveFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={() => { onFiltersChange({ ...filters, labelId: '' }); setFilterOpen(false) }}
              >
                <X className="h-3 w-3" /> Limpar filtro
              </Button>
            )}
          </PopoverContent>
        </Popover>

        {onNewConversation && (
          <NewConversationModal onSuccess={onNewConversation} />
        )}
      </div>

      {/* Archived toggle */}
      <div className="px-3 pb-2">
        <button
          onClick={() => onFiltersChange({ ...filters, archived: !filters.archived })}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
            filters.archived
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Archive className="h-3 w-3" />
          {filters.archived ? 'Mostrando arquivadas' : 'Ver arquivadas'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              {search ? 'Nenhuma conversa encontrada' : filters.archived ? 'Nenhuma conversa arquivada' : 'Nenhuma conversa ainda'}
            </p>
          </div>
        ) : (
          filtered.map((contact) => {
            const lastMsg = contact.messages?.[0]
            const isSelected = contact.id === selectedId
            const unread = (contact.unreadCount ?? 0) > 0 && !isSelected
            return (
              <button
                key={contact.id}
                onClick={() => onSelect(contact)}
                className={cn(
                  'flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left transition-colors hover:bg-muted/50',
                  isSelected && 'bg-accent'
                )}
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {(contact.name ?? contact.phone)[0].toUpperCase()}
                  {unread && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                      {(contact.unreadCount ?? 0) > 99 ? '99+' : contact.unreadCount}
                    </span>
                  )}
                  {!unread && contact.assignedTo && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-primary/20 text-[8px] font-bold text-primary"
                      title={`Responsável: ${contact.assignedTo.name}`}
                    >
                      {contact.assignedTo.name[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className={cn('truncate text-sm', unread ? 'font-semibold' : 'font-medium')}>
                      {contact.name ?? contact.phone}
                    </span>
                    {contact.lastMessageAt && (
                      <span className={cn('shrink-0 text-[10px]', unread ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                        {formatDistanceToNow(new Date(contact.lastMessageAt), {
                          addSuffix: false,
                          locale: ptBR,
                        })}
                      </span>
                    )}
                  </div>
                  <p className={cn('truncate text-xs', unread ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                    {lastMsg
                      ? (lastMsg.fromMe ? 'Você: ' : '') + (lastMsg.body || '📎 Mídia')
                      : contact.phone}
                  </p>
                  {/* Labels */}
                  {(contact.labels?.length ?? 0) > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {contact.labels!.map((label) => (
                        <span
                          key={label.id}
                          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium text-white"
                          style={{ backgroundColor: label.color }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
