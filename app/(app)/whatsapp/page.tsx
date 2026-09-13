'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Wifi, WifiOff, PhoneOff, Loader2, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QRSetup } from '@/components/whatsapp/qr-setup'
import { ConversationList, type ConversationFilters } from '@/components/whatsapp/conversation-list'
import { ChatView } from '@/components/whatsapp/chat-view'
import { ContactPanel } from '@/components/whatsapp/contact-panel'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  getWhatsAppInstance,
  listConversations,
  disconnectWhatsApp,
  syncWhatsAppContacts,
  markConversationRead,
  listWhatsAppLabels,
} from '@/lib/api'
import type { WhatsAppContact, WhatsAppInstance, WhatsAppLabel } from '@/lib/types'
import { WhatsAppSettingsSheet } from '@/components/whatsapp/settings-sheet'
import { WhatsAppAnalyticsSheet } from '@/components/whatsapp/analytics-sheet'
import { usePermissions } from '@/hooks/use-permissions'
import { toast } from 'sonner'

function showBrowserNotification(name: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(`WhatsApp — ${name}`, { body, icon: '/favicon.ico', tag: 'whatsapp-msg' })
  } catch {
    // silent
  }
}

const DEFAULT_FILTERS: ConversationFilters = { archived: false, labelId: '' }

export default function WhatsAppPage() {
  const { has } = usePermissions()
  const canManage = has('whatsapp_manage')
  const canSend = has('whatsapp_send')

  const [instance, setInstance] = useState<WhatsAppInstance | null>(null)
  const [instanceLoading, setInstanceLoading] = useState(true)
  const [conversations, setConversations] = useState<WhatsAppContact[]>([])
  const [selectedContact, setSelectedContact] = useState<WhatsAppContact | null>(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<ConversationFilters>(DEFAULT_FILTERS)
  const [labels, setLabels] = useState<WhatsAppLabel[]>([])
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('whatsapp_sound') !== 'false'
  })

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev
      localStorage.setItem('whatsapp_sound', next ? 'true' : 'false')
      return next
    })
  }

  // Refs for notification diffing
  const prevLastMessageAtRef = useRef<Map<string, string>>(new Map())
  const isFirstFetchRef = useRef(true)
  const selectedContactRef = useRef<WhatsAppContact | null>(null)
  const filtersRef = useRef(filters)

  useEffect(() => { selectedContactRef.current = selectedContact }, [selectedContact])
  useEffect(() => { filtersRef.current = filters }, [filters])

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }, [])

  const fetchLabels = useCallback(async () => {
    try {
      const data = await listWhatsAppLabels()
      setLabels(data)
    } catch {
      // silent
    }
  }, [])

  const fetchInstance = useCallback(async () => {
    const inst = await getWhatsAppInstance()
    setInstance(inst)
    return inst
  }, [])

  const fetchConversations = useCallback(async () => {
    const f = filtersRef.current
    const data = await listConversations({
      archived: f.archived || undefined,
      labelId: f.labelId || undefined,
    })

    // Detect new messages in conversations the user isn't currently viewing
    if (!isFirstFetchRef.current) {
      for (const contact of data) {
        if (contact.id === selectedContactRef.current?.id) continue
        const prev = prevLastMessageAtRef.current.get(contact.id)
        if (prev && contact.lastMessageAt && contact.lastMessageAt !== prev) {
          const lastMsg = contact.messages?.[0]
          if (lastMsg && !lastMsg.fromMe) {
            showBrowserNotification(contact.name ?? contact.phone, lastMsg.body || '📎 Mídia')
          }
        }
      }
    }

    prevLastMessageAtRef.current = new Map(data.map((c) => [c.id, c.lastMessageAt ?? '']))
    isFirstFetchRef.current = false

    setConversations(data)
    setSelectedContact((prev) =>
      prev ? (data.find((c) => c.id === prev.id) ?? prev) : null
    )
  }, [])

  useEffect(() => {
    fetchInstance().finally(() => setInstanceLoading(false))
  }, [fetchInstance])

  useEffect(() => {
    if (instance?.status !== 'connected') return
    requestNotificationPermission()
    fetchLabels()
    isFirstFetchRef.current = true
    fetchConversations()
    const interval = setInterval(fetchConversations, 6000)
    return () => clearInterval(interval)
  }, [instance?.status, fetchConversations, requestNotificationPermission, fetchLabels])

  // Re-fetch when filters change
  useEffect(() => {
    if (instance?.status !== 'connected') return
    isFirstFetchRef.current = true
    fetchConversations()
  }, [filters, instance?.status, fetchConversations])

  const handleFiltersChange = useCallback((f: ConversationFilters) => {
    setFilters(f)
  }, [])

  const handleSelectContact = useCallback(async (contact: WhatsAppContact) => {
    setSelectedContact(contact)
    if ((contact.unreadCount ?? 0) > 0) {
      setConversations((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, unreadCount: 0 } : c))
      )
      try {
        await markConversationRead(contact.id)
      } catch {
        // best-effort
      }
    }
  }, [])

  const handleDisconnect = () => setShowDisconnectDialog(true)

  const confirmDisconnect = async () => {
    setShowDisconnectDialog(false)
    setDisconnecting(true)
    try {
      await disconnectWhatsApp()
      setInstance(null)
      setConversations([])
      setSelectedContact(null)
      toast.success('WhatsApp desconectado')
    } catch {
      toast.error('Erro ao desconectar')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSyncContacts = async () => {
    setSyncing(true)
    try {
      const result = await syncWhatsAppContacts()
      toast.success(`${result.savedCount} contatos sincronizados`)
      fetchConversations()
    } catch {
      toast.error('Erro ao sincronizar contatos')
    } finally {
      setSyncing(false)
    }
  }

  if (instanceLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isConnected = instance?.status === 'connected'

  return (
    <div className="flex h-svh flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-primary" />
          ) : (
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {isConnected
              ? `Conectado${instance?.phoneNumber ? ` · +${instance.phoneNumber}` : ''}`
              : instance?.status === 'connecting'
              ? 'Conectando…'
              : 'WhatsApp desconectado'}
          </span>
        </div>
        {isConnected && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleSound}
              title={soundEnabled ? 'Desativar som de notificação' : 'Ativar som de notificação'}
            >
              {soundEnabled
                ? <Volume2 className="h-4 w-4" />
                : <VolumeX className="h-4 w-4 text-muted-foreground" />}
            </Button>
            {canManage && (
              <>
                <WhatsAppAnalyticsSheet />
                <WhatsAppSettingsSheet
                  instance={instance!}
                  onInstanceUpdated={setInstance}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleSyncContacts}
                  disabled={syncing}
                >
                  {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Sincronizar Contatos
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOff className="h-4 w-4" />}
                  Desconectar
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      {!isConnected ? (
        canManage ? (
          <QRSetup onConnected={(inst) => { setInstance(inst); fetchConversations() }} />
        ) : (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <WifiOff className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              WhatsApp não conectado. Solicite ao administrador da clínica.
            </p>
          </div>
        )
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: conversation list */}
          <div className="w-72 shrink-0">
            <ConversationList
              contacts={conversations}
              selectedId={selectedContact?.id ?? null}
              onSelect={handleSelectContact}
              search={search}
              onSearchChange={setSearch}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              labels={labels}
              onNewConversation={(contact) => {
                fetchConversations().then(() => {
                  handleSelectContact(contact)
                  setSearch('')
                })
              }}
            />
          </div>

          {/* Center: chat */}
          <div className="flex flex-1 flex-col overflow-hidden border-r border-border">
            {selectedContact ? (
              <ChatView
                contact={selectedContact}
                canSend={canSend}
                soundEnabled={soundEnabled}
                onNewIncomingMessage={fetchConversations}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Selecione uma conversa para começar
                </p>
              </div>
            )}
          </div>

          {/* Right: contact panel */}
          <div className="w-64 shrink-0">
            {selectedContact ? (
              <ContactPanel
                contact={selectedContact}
                canManage={canManage}
                onContactUpdated={() => {
                  fetchConversations()
                  fetchLabels()
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-4">
                <p className="text-center text-xs text-muted-foreground">
                  Selecione uma conversa para ver o contato
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar WhatsApp</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desconectar o WhatsApp desta clínica? Você precisará escanear o QR code novamente para reconectar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisconnect}
              disabled={disconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
