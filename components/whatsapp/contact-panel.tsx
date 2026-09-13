'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Phone, User, PawPrint, CalendarPlus, UserPlus, ExternalLink, Archive, ArchiveRestore, Tag, Plus, X, Check, Loader2, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { CreatePatientModal } from './create-patient-modal'
import { NewAppointmentModal } from './new-appointment-modal'
import type { WhatsAppContact, WhatsAppLabel, WhatsAppTeamMember } from '@/lib/types'
import {
  archiveContact,
  updateContactNotes,
  listWhatsAppLabels,
  createWhatsAppLabel,
  setContactLabels,
  listWhatsAppTeam,
  assignConversation,
} from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  contact: WhatsAppContact
  canManage: boolean
  onContactUpdated: () => void
}

const LABEL_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
  '#6B7280', '#14532D',
]

export function ContactPanel({ contact, canManage, onContactUpdated }: Props) {
  const [showCreatePatient, setShowCreatePatient] = useState(false)
  const [showNewAppointment, setShowNewAppointment] = useState(false)
  const [archiving, setArchiving] = useState(false)

  // Notes
  const [notes, setNotes] = useState(contact.internalNotes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Labels
  const [allLabels, setAllLabels] = useState<WhatsAppLabel[]>([])
  const [contactLabelIds, setContactLabelIds] = useState<Set<string>>(
    new Set((contact.labels ?? []).map((l) => l.id))
  )
  const [labelPopoverOpen, setLabelPopoverOpen] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[5])
  const [creatingLabel, setCreatingLabel] = useState(false)

  // Assignment
  const [team, setTeam] = useState<WhatsAppTeamMember[]>([])
  const [assignPopoverOpen, setAssignPopoverOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)

  const displayName = contact.name ?? contact.phone

  useEffect(() => {
    setNotes(contact.internalNotes ?? '')
    setContactLabelIds(new Set((contact.labels ?? []).map((l) => l.id)))
  }, [contact.id, contact.internalNotes, contact.labels])

  const fetchLabels = useCallback(async () => {
    try {
      const data = await listWhatsAppLabels()
      setAllLabels(data)
    } catch {
      // silent
    }
  }, [])

  const fetchTeam = useCallback(async () => {
    try {
      const data = await listWhatsAppTeam()
      setTeam(data)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchLabels()
    fetchTeam()
  }, [fetchLabels, fetchTeam])

  // Debounced notes save
  const handleNotesChange = (value: string) => {
    setNotes(value)
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current)
    notesTimerRef.current = setTimeout(async () => {
      setSavingNotes(true)
      try {
        await updateContactNotes(contact.id, value || null)
      } catch {
        toast.error('Erro ao salvar nota')
      } finally {
        setSavingNotes(false)
      }
    }, 1000)
  }

  const handleArchive = async () => {
    setArchiving(true)
    try {
      const result = await archiveContact(contact.id)
      toast.success(result.archived ? 'Conversa arquivada' : 'Conversa desarquivada')
      onContactUpdated()
    } catch {
      toast.error('Erro ao arquivar conversa')
    } finally {
      setArchiving(false)
    }
  }

  const toggleLabel = async (labelId: string) => {
    const next = new Set(contactLabelIds)
    if (next.has(labelId)) next.delete(labelId)
    else next.add(labelId)
    setContactLabelIds(next)
    try {
      await setContactLabels(contact.id, Array.from(next))
      onContactUpdated()
    } catch {
      toast.error('Erro ao atualizar etiquetas')
      setContactLabelIds(contactLabelIds) // revert
    }
  }

  const handleAssign = async (userId: string | null) => {
    setAssigning(true)
    try {
      await assignConversation(contact.id, userId)
      onContactUpdated()
      setAssignPopoverOpen(false)
    } catch {
      toast.error('Erro ao atribuir conversa')
    } finally {
      setAssigning(false)
    }
  }

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return
    setCreatingLabel(true)
    try {
      const label = await createWhatsAppLabel({ name: newLabelName.trim(), color: newLabelColor })
      setAllLabels((prev) => [...prev, label])
      setNewLabelName('')
      // auto-assign to this contact
      const next = new Set(contactLabelIds)
      next.add(label.id)
      setContactLabelIds(next)
      await setContactLabels(contact.id, Array.from(next))
      onContactUpdated()
    } catch {
      toast.error('Erro ao criar etiqueta')
    } finally {
      setCreatingLabel(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* Contact info */}
      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
          {displayName[0].toUpperCase()}
        </div>
        <p className="font-semibold">{displayName}</p>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Phone className="h-3.5 w-3.5" />
          <span>{contact.phone}</span>
        </div>
      </div>

      <Separator />

      {/* Labels */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Etiquetas</p>
          {canManage && (
            <Popover open={labelPopoverOpen} onOpenChange={setLabelPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Tag className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3 space-y-3" align="end">
                <p className="text-xs font-semibold">Gerenciar etiquetas</p>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                  {allLabels.map((label) => {
                    const active = contactLabelIds.has(label.id)
                    return (
                      <button
                        key={label.id}
                        onClick={() => toggleLabel(label.id)}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="flex-1 text-left">{label.name}</span>
                        {active && <Check className="h-3.5 w-3.5 text-primary" />}
                      </button>
                    )
                  })}
                  {allLabels.length === 0 && (
                    <p className="text-xs text-muted-foreground px-2">Nenhuma etiqueta ainda</p>
                  )}
                </div>
                <Separator />
                <p className="text-xs font-semibold">Nova etiqueta</p>
                <div className="flex gap-1.5">
                  <Input
                    placeholder="Nome..."
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateLabel()}
                    className="h-7 text-xs"
                  />
                  <Button
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={handleCreateLabel}
                    disabled={creatingLabel || !newLabelName.trim()}
                  >
                    {creatingLabel ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {LABEL_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewLabelColor(color)}
                      className={cn('h-5 w-5 rounded-full transition-transform', newLabelColor === color && 'ring-2 ring-offset-1 ring-foreground scale-110')}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        {contactLabelIds.size === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma etiqueta</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {allLabels.filter((l) => contactLabelIds.has(l.id)).map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
                {canManage && (
                  <button onClick={() => toggleLabel(label.id)} className="opacity-70 hover:opacity-100">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Assignee */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Responsável</p>
          {canManage && (
            <Popover open={assignPopoverOpen} onOpenChange={setAssignPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={assigning}>
                  {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCircle className="h-3.5 w-3.5" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-2" align="end">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleAssign(null)}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50',
                      !contact.assignedToId && 'bg-accent font-medium'
                    )}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px]">
                      —
                    </div>
                    Nenhum
                  </button>
                  {team.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleAssign(member.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50',
                        contact.assignedToId === member.id && 'bg-accent font-medium'
                      )}
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                        {member.name[0].toUpperCase()}
                      </div>
                      <span className="truncate">{member.name}</span>
                      {contact.assignedToId === member.id && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-primary" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        {contact.assignedTo ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
              {contact.assignedTo.name[0].toUpperCase()}
            </div>
            <span className="truncate text-sm">{contact.assignedTo.name}</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Não atribuído</p>
        )}
      </div>

      <Separator />

      {/* Linked tutor */}
      {contact.tutor ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tutor</p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-sm">{contact.tutor.name}</span>
          </div>
        </div>
      ) : null}

      {/* Linked patient */}
      {contact.patient ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Paciente</p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <PawPrint className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-sm">{contact.patient.name}</span>
            <Link href={`/pacientes/${contact.patient.id}`} target="_blank">
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </Link>
          </div>
        </div>
      ) : null}

      {/* Internal notes */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notas internas</p>
          {savingNotes && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        <Textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Anotações visíveis apenas para a equipe..."
          rows={3}
          className="text-xs resize-none"
          disabled={!canManage}
        />
      </div>

      {/* Actions */}
      {canManage && (
        <div className="space-y-2">
          <Separator />
          {!contact.patientId && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => setShowCreatePatient(true)}
            >
              <UserPlus className="h-4 w-4" />
              Criar paciente
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => setShowNewAppointment(true)}
            disabled={!contact.patientId}
          >
            <CalendarPlus className="h-4 w-4" />
            <span className="truncate">{contact.patientId ? 'Novo agendamento' : 'Crie o paciente para agendar'}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={handleArchive}
            disabled={archiving}
          >
            {archiving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : contact.archived ? (
              <ArchiveRestore className="h-4 w-4" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            {contact.archived ? 'Desarquivar conversa' : 'Arquivar conversa'}
          </Button>
        </div>
      )}

      {/* Modals */}
      {showCreatePatient && (
        <CreatePatientModal
          contact={contact}
          open={showCreatePatient}
          onClose={() => setShowCreatePatient(false)}
          onCreated={onContactUpdated}
        />
      )}
      {showNewAppointment && (
        <NewAppointmentModal
          contact={contact}
          open={showNewAppointment}
          onClose={() => setShowNewAppointment(false)}
          onCreated={onContactUpdated}
        />
      )}
    </div>
  )
}
