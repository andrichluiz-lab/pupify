'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Send, Loader2, Check, CheckCheck, Paperclip, X,
  FileText, Film, Music, Download, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getMessages, sendWhatsAppMessage, sendWhatsAppMedia, listQuickReplies } from '@/lib/api'
import type { WhatsAppContact, WhatsAppMessage, WhatsAppQuickReply } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  contact: WhatsAppContact
  canSend: boolean
  soundEnabled?: boolean
  onNewIncomingMessage?: () => void
}

interface PendingFile {
  file: File
  previewUrl: string | null  // object URL for images
  mediatype: 'image' | 'video' | 'audio' | 'document'
}

interface TempMessage {
  id: string
  body: string
  type: string
  mediaUrl: string | null
  isSending: boolean
  error?: boolean
}

function playNotificationBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
  } catch {
    // silent fail
  }
}

function detectMediatype(mime: string): PendingFile['mediatype'] {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'document'
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'read') return <CheckCheck className="h-3 w-3 text-blue-300" />
  if (status === 'delivered') return <CheckCheck className="h-3 w-3" />
  return <Check className="h-3 w-3" />
}

function MessageMeta({ msg }: { msg: WhatsAppMessage }) {
  return (
    <div
      className={cn(
        'mt-0.5 flex items-center justify-end gap-0.5 text-[10px]',
        msg.fromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
      )}
    >
      <span>{format(new Date(msg.timestamp), 'HH:mm', { locale: ptBR })}</span>
      {msg.fromMe && <StatusIcon status={msg.status} />}
    </div>
  )
}

function TempMessageItem({ msg }: { msg: TempMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[72%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3 py-2 text-sm">
        {msg.type === 'image' && msg.mediaUrl && (
          <div className="flex flex-col gap-1">
            <img src={msg.mediaUrl} alt="Imagem" className="rounded-md max-w-full max-h-[300px] object-cover" />
            {msg.body && <p className="whitespace-pre-wrap break-words text-sm mt-0.5">{msg.body}</p>}
          </div>
        )}
        {msg.type === 'video' && (
          <div className="flex items-center gap-2 opacity-70">
            <Film className="h-4 w-4" />
            <span className="text-xs italic">Vídeo</span>
          </div>
        )}
        {msg.type === 'audio' && (
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            <span className="text-xs italic">Áudio</span>
          </div>
        )}
        {msg.type === 'document' && (
          <div className="flex items-center gap-2 rounded-lg bg-black/10 px-3 py-2">
            <FileText className="h-5 w-5 shrink-0 opacity-70" />
            <span className="flex-1 truncate text-sm">{msg.body || 'Documento'}</span>
          </div>
        )}
        {msg.type === 'text' && <p className="whitespace-pre-wrap break-words">{msg.body}</p>}
        <div className="mt-0.5 flex items-center justify-end gap-0.5 text-[10px] text-primary-foreground/70">
          <span>{format(new Date(), 'HH:mm', { locale: ptBR })}</span>
          {msg.isSending && <Loader2 className="h-3 w-3 animate-spin" />}
          {msg.error && <span className="text-destructive">!</span>}
        </div>
      </div>
    </div>
  )
}

function MediaMessage({ msg }: { msg: WhatsAppMessage }) {
  if (msg.type === 'image') {
    return (
      <div className="flex flex-col gap-1">
        {msg.mediaUrl ? (
          <div className="group relative">
            <img
              src={msg.mediaUrl}
              alt="Imagem"
              className="rounded-md max-w-full max-h-[300px] object-cover"
            />
            <a
              href={msg.mediaUrl}
              download="imagem.jpg"
              className="absolute right-1.5 top-1.5 hidden rounded-full bg-black/50 p-1 text-white group-hover:flex"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : (
          <p className="text-xs italic opacity-70">[Imagem]</p>
        )}
        {msg.body && <p className="whitespace-pre-wrap break-words text-sm mt-0.5">{msg.body}</p>}
        <MessageMeta msg={msg} />
      </div>
    )
  }

  if (msg.type === 'video') {
    return (
      <div className="flex flex-col gap-1">
        {msg.mediaUrl ? (
          <video src={msg.mediaUrl} controls className="rounded-md max-w-full max-h-[300px]" />
        ) : (
          <div className="flex items-center gap-2 opacity-70">
            <Film className="h-4 w-4" />
            <span className="text-xs italic">Vídeo</span>
          </div>
        )}
        {msg.body && <p className="whitespace-pre-wrap break-words text-sm mt-0.5">{msg.body}</p>}
        <MessageMeta msg={msg} />
      </div>
    )
  }

  if (msg.type === 'audio') {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Music className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Áudio</span>
        </div>
        {msg.mediaUrl && (
          <audio controls className="w-full max-w-[280px]">
            <source src={msg.mediaUrl} />
            Seu navegador não suporta áudio.
          </audio>
        )}
        {msg.audioDuration && <p className="text-xs opacity-70">{msg.audioDuration}s</p>}
        <MessageMeta msg={msg} />
      </div>
    )
  }

  if (msg.type === 'document') {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 rounded-lg bg-black/10 px-3 py-2">
          <FileText className="h-5 w-5 shrink-0 opacity-70" />
          <span className="flex-1 truncate text-sm">{msg.body || 'Documento'}</span>
          {msg.mediaUrl && (
            <button onClick={() => downloadDataUrl(msg.mediaUrl!, msg.body || 'arquivo')}>
              <Download className="h-4 w-4 opacity-70 hover:opacity-100" />
            </button>
          )}
        </div>
        <MessageMeta msg={msg} />
      </div>
    )
  }

  return (
    <>
      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
      <MessageMeta msg={msg} />
    </>
  )
}

export function ChatView({ contact, canSend, soundEnabled = true, onNewIncomingMessage }: Props) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [tempMessages, setTempMessages] = useState<TempMessage[]>([])
  const [text, setText] = useState('')
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null)
  const [quickReplies, setQuickReplies] = useState<WhatsAppQuickReply[]>([])
  const [qrDropdown, setQrDropdown] = useState<WhatsAppQuickReply[]>([])
  const [qrHighlight, setQrHighlight] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevCountRef = useRef<number>(-1)
  const soundEnabledRef = useRef(soundEnabled)
  useEffect(() => { soundEnabledRef.current = soundEnabled }, [soundEnabled])

  useEffect(() => {
    listQuickReplies().then(setQuickReplies).catch(() => {})
  }, [])

  const fetchMessages = useCallback(async () => {
    try {
      const data = await getMessages(contact.id)
      const newMessages = data.messages

      if (prevCountRef.current >= 0 && newMessages.length > prevCountRef.current) {
        const added = newMessages.slice(prevCountRef.current)
        if (added.some((m) => !m.fromMe)) {
          if (soundEnabledRef.current) playNotificationBeep()
          onNewIncomingMessage?.()
        }
      }
      prevCountRef.current = newMessages.length
      setMessages(newMessages)
    } catch {
      // silent
    }
  }, [contact.id, onNewIncomingMessage])

  useEffect(() => {
    prevCountRef.current = -1
    fetchMessages()
    const interval = setInterval(fetchMessages, 4000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Cleanup object URL on unmount / file change
  useEffect(() => {
    return () => {
      if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl)
    }
  }, [pendingFile])

  const applyQuickReply = useCallback((qr: WhatsAppQuickReply) => {
    const content = qr.content
      .replace(/\{\{nome\}\}/gi, contact.name ?? contact.phone)
      .replace(/\{\{telefone\}\}/gi, contact.phone)
    setText(content)
    setQrDropdown([])
    textareaRef.current?.focus()
  }, [contact.name, contact.phone])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setText(val)
    if (val.startsWith('/') && !pendingFile) {
      const query = val.slice(1).toLowerCase()
      setQrDropdown(quickReplies.filter((qr) => qr.shortcut.includes(query) || qr.content.toLowerCase().includes(query)))
      setQrHighlight(0)
    } else {
      setQrDropdown([])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!e.target.files?.[0]) return
    if (file!.size > 16 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx. 16 MB)')
      return
    }
    const mediatype = detectMediatype(file!.type)
    const previewUrl = mediatype === 'image' ? URL.createObjectURL(file!) : null
    setPendingFile({ file: file!, previewUrl, mediatype })
    e.target.value = ''
  }

  const clearPendingFile = () => {
    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl)
    setPendingFile(null)
  }

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed && !pendingFile) return

    // Create temporary message with sending status
    const tempId = `temp-${Date.now()}`
    const tempMessage: TempMessage = {
      id: tempId,
      body: trimmed,
      type: pendingFile ? pendingFile.mediatype : 'text',
      mediaUrl: pendingFile?.previewUrl || null,
      isSending: true,
    }

    // Add message immediately
    setTempMessages((prev) => [...prev, tempMessage])
    setText('')
    const fileToSend = pendingFile
    setPendingFile(null)

    // Send in background
    try {
      if (fileToSend) {
        await sendWhatsAppMedia(contact.id, fileToSend.file, trimmed || undefined)
      } else {
        await sendWhatsAppMessage(contact.id, trimmed)
      }
      // Remove temp message and refresh messages
      setTempMessages((prev) => prev.filter((m) => m.id !== tempId))
      await fetchMessages()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao enviar mensagem'
      toast.error(message)
      // Mark temp message as error
      setTempMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, isSending: false, error: true } : m))
      )
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (qrDropdown.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setQrHighlight((h) => Math.min(h + 1, qrDropdown.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setQrHighlight((h) => Math.max(h - 1, 0)); return }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) { e.preventDefault(); applyQuickReply(qrDropdown[qrHighlight]); return }
      if (e.key === 'Escape') { setQrDropdown([]); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSubmit = !!pendingFile || !!text.trim()

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {(contact.name ?? contact.phone)[0].toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium">{contact.name ?? contact.phone}</p>
          <p className="text-xs text-muted-foreground">{contact.phone}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex', msg.fromMe ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[72%] rounded-2xl px-3 py-2 text-sm',
                msg.fromMe
                  ? 'rounded-br-sm bg-primary text-primary-foreground'
                  : 'rounded-bl-sm bg-muted'
              )}
            >
              <MediaMessage msg={msg} />
            </div>
          </div>
        ))}
        {tempMessages.map((msg) => (
          <TempMessageItem key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {canSend && (
        <div className="relative border-t border-border">
          {/* Quick reply dropdown */}
          {qrDropdown.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 z-50 max-h-52 overflow-y-auto rounded-t-lg border border-border bg-popover shadow-lg">
              <div className="flex items-center gap-1.5 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" />
                Respostas rápidas — ↑↓ navegar · Tab/Enter aplicar · Esc fechar
              </div>
              {qrDropdown.map((qr, i) => (
                <button
                  key={qr.id}
                  className={cn(
                    'flex w-full items-baseline gap-2 px-3 py-2 text-left hover:bg-accent',
                    i === qrHighlight && 'bg-accent'
                  )}
                  onMouseDown={(e) => { e.preventDefault(); applyQuickReply(qr) }}
                  onMouseEnter={() => setQrHighlight(i)}
                >
                  <span className="shrink-0 font-mono text-xs font-semibold text-primary">/{qr.shortcut}</span>
                  <span className="truncate text-xs text-muted-foreground">{qr.content.slice(0, 80)}</span>
                </button>
              ))}
            </div>
          )}

          {/* File preview bar */}
          {pendingFile && (
            <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-3 py-2">
              {pendingFile.previewUrl ? (
                <img src={pendingFile.previewUrl} alt="Preview" className="h-12 w-12 rounded-md object-cover" />
              ) : pendingFile.mediatype === 'video' ? (
                <Film className="h-8 w-8 text-muted-foreground" />
              ) : pendingFile.mediatype === 'audio' ? (
                <Music className="h-8 w-8 text-muted-foreground" />
              ) : (
                <FileText className="h-8 w-8 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{pendingFile.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(pendingFile.file.size)}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={clearPendingFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex items-end gap-2 p-3">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={handleFileSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canSubmit}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={pendingFile ? 'Legenda (opcional)...' : 'Digite uma mensagem ou / para atalhos…'}
              rows={1}
              className="max-h-28 min-h-9 resize-none text-sm"
            />
            <Button size="icon" onClick={handleSend} disabled={!canSubmit}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
