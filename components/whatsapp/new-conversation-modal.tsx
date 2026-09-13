'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2, Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { startWhatsAppConversation, listWhatsAppContacts } from '@/lib/api'
import type { WhatsAppContact } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  onSuccess: (contact: WhatsAppContact) => void
}

export function NewConversationModal({ onSuccess }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'contacts' | 'manual'>('contacts')
  const [contacts, setContacts] = useState<WhatsAppContact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState<WhatsAppContact | null>(null)

  const fetchContacts = async () => {
    setContactsLoading(true)
    try {
      const data = await listWhatsAppContacts(search)
      setContacts(data)
    } catch {
      toast.error('Erro ao buscar contatos')
    } finally {
      setContactsLoading(false)
    }
  }

  useEffect(() => {
    if (open && mode === 'contacts') {
      fetchContacts()
    }
  }, [open, mode])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (mode === 'contacts') {
        fetchContacts()
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [search, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      let contact: WhatsAppContact
      
      if (mode === 'contacts') {
        if (!selectedContact) return
        // Start conversation with existing contact
        const cleanPhone = selectedContact.phone.replace(/\D/g, '')
        contact = await startWhatsAppConversation({ phone: cleanPhone, name: selectedContact.name ?? undefined })
      } else {
        if (!phone) return
        contact = await startWhatsAppConversation({ phone, name: name || undefined })
      }
      
      toast.success('Conversa iniciada')
      setOpen(false)
      setSelectedContact(null)
      setSearch('')
      setPhone('')
      setName('')
      onSuccess(contact)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao iniciar conversa'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter((c) => {
    const q = search.toLowerCase()
    return c.name?.toLowerCase().includes(q) || c.phone.includes(q)
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
            <DialogDescription>
              {mode === 'contacts'
                ? 'Selecione um contato sincronizado ou digite um número manualmente.'
                : 'Inicie uma conversa no WhatsApp com um novo número.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === 'contacts' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('contacts')}
                className="flex-1"
              >
                Contatos Sincronizados
              </Button>
              <Button
                type="button"
                variant={mode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('manual')}
                className="flex-1"
              >
                Digitar Número
              </Button>
            </div>

            {mode === 'contacts' ? (
              <>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar contato..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Contacts List */}
                <ScrollArea className="h-64 rounded-md border">
                  {contactsLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        {search ? 'Nenhum contato encontrado' : 'Nenhum contato sincronizado'}
                      </p>
                      {!search && (
                        <p className="text-xs text-muted-foreground">
                          Sincronize os contatos para ver a lista
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredContacts.map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => setSelectedContact(contact)}
                          className={cn(
                            'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                            selectedContact?.id === contact.id && 'bg-accent'
                          )}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {(contact.name ?? contact.phone)[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {contact.name ?? 'Sem nome'}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {contact.phone}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Número do WhatsApp *</Label>
                  <Input
                    id="phone"
                    placeholder="Ex: 5511999999999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="off"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Apenas números, incluindo o DDI (55) e DDD.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome (Opcional)</Label>
                  <Input
                    id="name"
                    placeholder="Ex: João da Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false)
                setSelectedContact(null)
                setSearch('')
                setPhone('')
                setName('')
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || (mode === 'contacts' && !selectedContact) || (mode === 'manual' && !phone)}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'contacts' ? 'Selecionar Contato' : 'Iniciar Conversa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
