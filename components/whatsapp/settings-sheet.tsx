'use client'

import { useState, useEffect, useCallback } from 'react'
import { Settings, Plus, Trash2, Loader2, ToggleLeft, ToggleRight, Pencil, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import type { WhatsAppInstance, WhatsAppQuickReply, WhatsAppAutoResponse } from '@/lib/types'
import {
  updateWhatsAppSettings,
  listQuickReplies, createQuickReply, updateQuickReply, deleteQuickReply,
  listAutoResponses, createAutoResponse, updateAutoResponse, deleteAutoResponse,
} from '@/lib/api'
import { cn } from '@/lib/utils'

interface Props {
  instance: WhatsAppInstance
  onInstanceUpdated: (inst: WhatsAppInstance) => void
}

// ── Auto-reply settings tab ───────────────────────────────────────────────────

function AutoReplyTab({ instance, onInstanceUpdated }: Props) {
  const [enabled, setEnabled] = useState(instance.autoReplyEnabled)
  const [outOfHours, setOutOfHours] = useState(instance.autoReplyOutOfHours ?? '')
  const [greeting, setGreeting] = useState(instance.autoReplyGreeting ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const updated = await updateWhatsAppSettings({
        autoReplyEnabled: enabled,
        autoReplyOutOfHours: outOfHours.trim() || null,
        autoReplyGreeting: greeting.trim() || null,
      })
      onInstanceUpdated(updated)
      toast.success('Configurações salvas')
    } catch {
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 py-1">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Auto-resposta ativa</p>
          <p className="text-xs text-muted-foreground">Ativa resposta automática fora do horário</p>
        </div>
        <button onClick={() => setEnabled((v) => !v)} className="text-primary">
          {enabled
            ? <ToggleRight className="h-5 w-5" />
            : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
        </button>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Mensagem fora do horário</Label>
        <Textarea
          value={outOfHours}
          onChange={(e) => setOutOfHours(e.target.value)}
          placeholder="Ex: Olá {{nome}}! No momento estamos fora do horário de atendimento. Retornaremos em breve!"
          rows={3}
          className="text-sm resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Use <code className="text-[11px] bg-muted px-1 rounded">{'{{nome}}'}</code> para o nome do contato
          e <code className="text-[11px] bg-muted px-1 rounded">{'{{telefone}}'}</code> para o número.
          O horário é configurado em <strong>Configurações da Clínica</strong>.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Mensagem de saudação (primeiro contato)</Label>
        <Textarea
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          placeholder="Ex: Olá {{nome}}, seja bem-vindo(a) à nossa clínica! Como podemos ajudar?"
          rows={3}
          className="text-sm resize-none"
        />
        <p className="text-xs text-muted-foreground">Enviada automaticamente na primeira mensagem recebida de um novo contato.</p>
      </div>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar configurações
      </Button>
    </div>
  )
}

// ── Quick replies tab ─────────────────────────────────────────────────────────

function QuickRepliesTab() {
  const [replies, setReplies] = useState<WhatsAppQuickReply[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newShortcut, setNewShortcut] = useState('')
  const [newContent, setNewContent] = useState('')
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const fetch = useCallback(async () => {
    try {
      setReplies(await listQuickReplies())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleCreate = async () => {
    if (!newShortcut.trim() || !newContent.trim()) return
    setCreating(true)
    try {
      const r = await createQuickReply({ shortcut: newShortcut.trim(), content: newContent.trim() })
      setReplies((prev) => [...prev, r])
      setNewShortcut('')
      setNewContent('')
      setShowForm(false)
      toast.success('Resposta rápida criada')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao criar resposta rápida'
      toast.error(message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteQuickReply(id)
      setReplies((prev) => prev.filter((r) => r.id !== id))
      toast.success('Removida')
    } catch {
      toast.error('Erro ao remover')
    }
  }

  const handleSaveEdit = async (r: WhatsAppQuickReply, newContent: string) => {
    try {
      const updated = await updateQuickReply(r.id, { shortcut: r.shortcut, content: newContent })
      setReplies((prev) => prev.map((x) => (x.id === r.id ? updated : x)))
      setEditingId(null)
      toast.success('Salvo')
    } catch {
      toast.error('Erro ao salvar')
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-3 py-1">
      <p className="text-xs text-muted-foreground">
        Digite <strong>/atalho</strong> no chat para usar. Variáveis: <code className="text-[11px] bg-muted px-1 rounded">{'{{nome}}'}</code> <code className="text-[11px] bg-muted px-1 rounded">{'{{telefone}}'}</code>
      </p>

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {replies.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma resposta rápida ainda</p>
        )}
        {replies.map((r) => (
          <EditableReply key={r.id} reply={r} onDelete={handleDelete} onSave={handleSaveEdit} />
        ))}
      </div>

      {showForm ? (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/</span>
              <Input
                placeholder="atalho"
                value={newShortcut}
                onChange={(e) => setNewShortcut(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="pl-5 text-sm"
              />
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowForm(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            placeholder="Conteúdo da resposta..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
            className="text-sm resize-none"
          />
          <Button size="sm" className="w-full" onClick={handleCreate} disabled={creating || !newShortcut || !newContent}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Criar
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Nova resposta rápida
        </Button>
      )}
    </div>
  )
}

function EditableReply({
  reply,
  onDelete,
  onSave,
}: {
  reply: WhatsAppQuickReply
  onDelete: (id: string) => void
  onSave: (r: WhatsAppQuickReply, content: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(reply.content)

  return (
    <div className="rounded-lg border border-border p-2.5 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono font-semibold text-primary">/{reply.shortcut}</span>
        <div className="flex gap-1">
          {editing ? (
            <>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { onSave(reply, content); setEditing(false) }}>
                <Check className="h-4 w-4 text-primary" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setContent(reply.content); setEditing(false) }}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDelete(reply.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      {editing ? (
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={2} className="text-xs resize-none" />
      ) : (
        <p className="text-xs text-muted-foreground line-clamp-2">{reply.content}</p>
      )}
    </div>
  )
}

// ── Auto-responses tab ────────────────────────────────────────────────────────

function AutoResponsesTab() {
  const [items, setItems] = useState<WhatsAppAutoResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [trigger, setTrigger] = useState('')
  const [response, setResponse] = useState('')
  const [creating, setCreating] = useState(false)

  const fetch = useCallback(async () => {
    try {
      setItems(await listAutoResponses())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleCreate = async () => {
    if (!trigger.trim() || !response.trim()) return
    setCreating(true)
    try {
      const item = await createAutoResponse({ trigger: trigger.trim(), response: response.trim() })
      setItems((prev) => [...prev, item])
      setTrigger('')
      setResponse('')
      setShowForm(false)
    } catch {
      toast.error('Erro ao criar auto-resposta')
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (item: WhatsAppAutoResponse) => {
    try {
      const updated = await updateAutoResponse(item.id, { trigger: item.trigger, response: item.response, active: !item.active })
      setItems((prev) => prev.map((x) => (x.id === item.id ? updated : x)))
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteAutoResponse(id)
      setItems((prev) => prev.filter((x) => x.id !== id))
    } catch {
      toast.error('Erro ao remover')
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-3 py-1">
      <p className="text-xs text-muted-foreground">
        Quando uma mensagem contiver a palavra-chave, responde automaticamente.
        Suporta variáveis <code className="text-[11px] bg-muted px-1 rounded">{'{{nome}}'}</code>.
      </p>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {items.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma auto-resposta configurada</p>
        )}
        {items.map((item) => (
          <div key={item.id} className={cn('rounded-lg border border-border p-2.5 space-y-1', !item.active && 'opacity-50')}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">🔑 {item.trigger}</span>
              <div className="flex gap-1">
                <button onClick={() => handleToggle(item)} title={item.active ? 'Desativar' : 'Ativar'}>
                  {item.active
                    ? <ToggleRight className="h-4 w-4 text-primary" />
                    : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                </button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{item.response}</p>
          </div>
        ))}
      </div>

      {showForm ? (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <Input
            placeholder="Palavra-chave (ex: agendar, horário, preço)"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="text-sm"
          />
          <Textarea
            placeholder="Resposta automática..."
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={3}
            className="text-sm resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleCreate} disabled={creating || !trigger || !response}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Nova auto-resposta
        </Button>
      )}
    </div>
  )
}

// ── Main sheet ────────────────────────────────────────────────────────────────

export function WhatsAppSettingsSheet({ instance, onInstanceUpdated }: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full max-w-[420px] overflow-y-auto">
        <SheetHeader className="px-4 pt-4 pb-4">
          <SheetTitle>Configurações WhatsApp</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <Tabs defaultValue="autoreply">
            <TabsList className="w-full">
              <TabsTrigger value="autoreply" className="flex-1 text-xs">Auto-resposta</TabsTrigger>
              <TabsTrigger value="quickreplies" className="flex-1 text-xs">Respostas Rápidas</TabsTrigger>
              <TabsTrigger value="autoresponses" className="flex-1 text-xs">Palavras-chave</TabsTrigger>
            </TabsList>
            <TabsContent value="autoreply">
              <AutoReplyTab instance={instance} onInstanceUpdated={onInstanceUpdated} />
            </TabsContent>
            <TabsContent value="quickreplies">
              <QuickRepliesTab />
            </TabsContent>
            <TabsContent value="autoresponses">
              <AutoResponsesTab />
            </TabsContent>
          </Tabs>
        </div>
        <div className="pb-4" />
      </SheetContent>
    </Sheet>
  )
}
