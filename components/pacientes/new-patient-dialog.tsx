"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Check, AlertCircle, Loader2, X, PawPrint } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createTutor } from "@/lib/api"
import { post } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

const TOTAL_STEPS = 5

const CONTACT_TYPES = ["Celular", "Residencial", "Comercial", "Recado"]

const HOW_FOUND = [
  "Indicação de amigo", "Google / Internet", "Redes sociais",
  "Panfleto / Material impresso", "Já era cliente", "Outro",
]

const PROFESSIONS = [
  "Funcionário CLT", "Servidor público", "Profissional liberal",
  "Empresário", "Autônomo", "Estudante", "Aposentado", "Outro",
]

const STATES: { uf: string; name: string }[] = [
  { uf: "AC", name: "Acre" }, { uf: "AL", name: "Alagoas" }, { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" }, { uf: "BA", name: "Bahia" }, { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" }, { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" }, { uf: "MA", name: "Maranhão" }, { uf: "MT", name: "Mato Grosso" },
  { uf: "MS", name: "Mato Grosso do Sul" }, { uf: "MG", name: "Minas Gerais" },
  { uf: "PA", name: "Pará" }, { uf: "PB", name: "Paraíba" }, { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" }, { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" }, { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" }, { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" }, { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" }, { uf: "SE", name: "Sergipe" }, { uf: "TO", name: "Tocantins" },
]

const SPECIES_OPTIONS = [
  { value: "Cao",    label: "Cão",    emoji: "🐕" },
  { value: "Gato",  label: "Gato",   emoji: "🐈" },
  { value: "Ave",   label: "Ave",    emoji: "🦜" },
  { value: "Roedor", label: "Roedor", emoji: "🐹" },
  { value: "Reptil", label: "Réptil", emoji: "🦎" },
  { value: "Outro", label: "Outro",  emoji: "🐾" },
]

const STEP_LABELS = [
  "Informações do cliente",
  "Contatos",
  "Endereço",
  "Informações complementares",
  "Animais",
]

interface ContactDraft {
  key: number
  type: string
  phone: string
  isWhatsapp: boolean
  notes: string
}

interface AnimalDraft {
  key: number
  name: string
  species: string
  breed: string
  sex: string
  birthDate: string
  weightKg: string
  color: string
  microchip: string
  neutered: boolean
  allergies: string
  chronicConditions: string
}

function emptyContact(): ContactDraft {
  return { key: Date.now(), type: "Celular", phone: "", isWhatsapp: true, notes: "" }
}

function emptyAnimal(): AnimalDraft {
  return {
    key: Date.now(),
    name: "", species: "Cao", breed: "", sex: "M",
    birthDate: "", weightKg: "", color: "", microchip: "",
    neutered: false, allergies: "", chronicConditions: "",
  }
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-300"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
        {step}/{TOTAL_STEPS}
      </span>
    </div>
  )
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialName?: string
}

export function NewPatientDialog({ open, onOpenChange, initialName }: Props) {
  const router = useRouter()
  const { toast } = useToast()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1
  const [personType, setPersonType] = useState<"fisica" | "juridica">("fisica")
  const [name, setName] = useState("")
  const [nationality, setNationality] = useState("Brasileiro")
  const [sex, setSex] = useState("")
  const [cpf, setCpf] = useState("")
  const [rg, setRg] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [howFound, setHowFound] = useState("")
  const [profession, setProfession] = useState("")
  const [municipalRegistration, setMunicipalRegistration] = useState("")

  // Step 2
  const [contacts, setContacts] = useState<ContactDraft[]>([emptyContact()])

  // Step 3
  const [cep, setCep] = useState("")
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState("")
  const [addressStreet, setAddressStreet] = useState("")
  const [addressNumber, setAddressNumber] = useState("")
  const [addressComplement, setAddressComplement] = useState("")
  const [addressNeighborhood, setAddressNeighborhood] = useState("")
  const [addressCity, setAddressCity] = useState("")
  const [addressState, setAddressState] = useState("")
  const [addressReference, setAddressReference] = useState("")

  // Step 4
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [extraNotes, setExtraNotes] = useState("")
  const [acceptEmail, setAcceptEmail] = useState(true)
  const [acceptSms, setAcceptSms] = useState(true)
  const [acceptCampaignSms, setAcceptCampaignSms] = useState(true)
  const [acceptWhatsapp, setAcceptWhatsapp] = useState(true)

  // Step 5
  const [animals, setAnimals] = useState<AnimalDraft[]>([])
  const [animalDialog, setAnimalDialog] = useState(false)
  const [editingAnimal, setEditingAnimal] = useState<AnimalDraft>(emptyAnimal())

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1)
      setPersonType("fisica")
      setName(initialName || "")
      setNationality("Brasileiro")
      setSex("")
      setCpf("")
      setRg("")
      setBirthDate("")
      setHowFound("")
      setProfession("")
      setMunicipalRegistration("")
      setContacts([emptyContact()])
      setCep("")
      setCepError("")
      setAddressStreet("")
      setAddressNumber("")
      setAddressComplement("")
      setAddressNeighborhood("")
      setAddressCity("")
      setAddressState("")
      setAddressReference("")
      setTags([])
      setTagInput("")
      setExtraNotes("")
      setAcceptEmail(true)
      setAcceptSms(true)
      setAcceptCampaignSms(true)
      setAcceptWhatsapp(true)
      setAnimals([])
    }
  }, [open, initialName])

  // CEP lookup
  const cepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lookupCep = useCallback(async (value: string) => {
    const clean = value.replace(/\D/g, "")
    if (clean.length !== 8) return
    setCepLoading(true)
    setCepError("")
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const json = await res.json()
      if (json.erro) { setCepError("CEP não encontrado."); return }
      setAddressStreet(json.logradouro || "")
      setAddressNeighborhood(json.bairro || "")
      setAddressCity(json.localidade || "")
      setAddressState(json.uf || "")
    } catch {
      setCepError("Erro ao buscar CEP.")
    } finally {
      setCepLoading(false)
    }
  }, [])

  function handleCepChange(value: string) {
    const masked = value.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2").slice(0, 9)
    setCep(masked)
    setCepError("")
    if (cepTimerRef.current) clearTimeout(cepTimerRef.current)
    cepTimerRef.current = setTimeout(() => lookupCep(masked), 600)
  }

  function updateContact<K extends keyof ContactDraft>(key: number, field: K, value: ContactDraft[K]) {
    setContacts(prev => prev.map(c => c.key === key ? { ...c, [field]: value } : c))
  }

  function addTag(val: string) {
    const t = val.trim()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput("")
  }

  function handleTagKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput) }
  }

  function openNewAnimal() {
    setEditingAnimal(emptyAnimal())
    setAnimalDialog(true)
  }

  function saveAnimal() {
    if (!editingAnimal.name.trim()) return
    const exists = animals.find(a => a.key === editingAnimal.key)
    if (exists) {
      setAnimals(prev => prev.map(a => a.key === editingAnimal.key ? editingAnimal : a))
    } else {
      setAnimals(prev => [...prev, editingAnimal])
    }
    setAnimalDialog(false)
  }

  function canAdvance(): boolean {
    if (step === 1) return name.trim().length > 0
    if (step === 2) return contacts.every(c => c.phone.trim().length > 0)
    return true
  }

  async function handleSave() {
    setSaving(true)
    try {
      const tutor = await createTutor({
        name,
        phone: contacts[0]?.phone || "",
        email: undefined,
        cpf: cpf || undefined,
        personType: personType || undefined,
        rg: rg || undefined,
        nationality: nationality || undefined,
        sex: sex || undefined,
        birthDate: birthDate || undefined,
        howFound: howFound || undefined,
        profession: profession || undefined,
        municipalRegistration: municipalRegistration || undefined,
        cep: cep || undefined,
        addressStreet: addressStreet || undefined,
        addressNumber: addressNumber || undefined,
        addressComplement: addressComplement || undefined,
        addressNeighborhood: addressNeighborhood || undefined,
        addressCity: addressCity || undefined,
        addressState: addressState || undefined,
        addressReference: addressReference || undefined,
        contacts: contacts.map(({ key: _k, ...rest }) => rest),
        notes: extraNotes || undefined,
        tags,
        acceptEmail,
        acceptSms,
        acceptCampaignSms,
        acceptWhatsapp,
      })

      for (const a of animals) {
        await post("/api/patients", {
          patient: {
            name: a.name,
            species: a.species,
            breed: a.breed,
            sex: a.sex,
            birthDate: a.birthDate ? new Date(a.birthDate).toISOString() : new Date().toISOString(),
            weightKg: parseFloat(a.weightKg) > 0 ? parseFloat(a.weightKg) : undefined,
            color: a.color || undefined,
            microchip: a.microchip || undefined,
            neutered: a.neutered,
            allergies: a.allergies ? a.allergies.split(",").map(s => s.trim()).filter(Boolean) : [],
            chronicConditions: a.chronicConditions ? a.chronicConditions.split(",").map(s => s.trim()).filter(Boolean) : [],
            tutorId: tutor.id,
          },
        })
      }

      toast({ title: "Cliente cadastrado!", description: `${name} foi adicionado ao sistema.` })
      onOpenChange(false)
      router.push(`/tutores/${tutor.id}`)
    } catch (err: unknown) {
      toast({
        title: "Erro ao cadastrar",
        description: err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-lg max-h-[90vh] flex flex-col gap-0 p-0"
          onInteractOutside={e => e.preventDefault()}
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <DialogTitle className="text-base">{STEP_LABELS[step - 1]}</DialogTitle>
            <ProgressBar step={step} />
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Step 1: Client info */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <Label>Tipo de pessoa</Label>
                  <Select value={personType} onValueChange={v => setPersonType(v as "fisica" | "juridica")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fisica">Pessoa física</SelectItem>
                      <SelectItem value="juridica">Pessoa jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <Label>Nome completo *</Label>
                    <Input
                      placeholder="Nome completo"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      autoFocus
                    />
                  </div>

                  {personType === "fisica" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <Label>Nacionalidade</Label>
                        <Input value={nationality} onChange={e => setNationality(e.target.value)} placeholder="Brasileiro" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label>Sexo</Label>
                        <Select value={sex} onValueChange={setSex}>
                          <SelectTrigger><SelectValue placeholder="Sexo" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">Masculino</SelectItem>
                            <SelectItem value="F">Feminino</SelectItem>
                            <SelectItem value="Outro">Prefiro não informar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {personType === "fisica" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <Label>CPF</Label>
                        <Input placeholder="000.000.000-00" value={cpf} onChange={e => setCpf(e.target.value)} maxLength={14} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label>RG</Label>
                        <Input placeholder="RG" value={rg} onChange={e => setRg(e.target.value)} />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <Label>Aniversário</Label>
                    <Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label>Como nos conheceu?</Label>
                    <Select value={howFound} onValueChange={setHowFound}>
                      <SelectTrigger><SelectValue placeholder="Como nos conheceu?" /></SelectTrigger>
                      <SelectContent>
                        {HOW_FOUND.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label>Profissão</Label>
                    <Select value={profession} onValueChange={setProfession}>
                      <SelectTrigger><SelectValue placeholder="Profissão" /></SelectTrigger>
                      <SelectContent>
                        {PROFESSIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {personType === "juridica" && (
                    <div className="flex flex-col gap-1">
                      <Label>Inscrição municipal</Label>
                      <Input
                        placeholder="Inscrição municipal"
                        value={municipalRegistration}
                        onChange={e => setMunicipalRegistration(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Contacts */}
            {step === 2 && (
              <div className="flex flex-col gap-5">
                {contacts.map((c, idx) => (
                  <div key={c.key} className="relative flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                    {idx > 0 && (
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Contato {idx + 1}</span>
                        <button type="button" onClick={() => setContacts(prev => prev.filter(x => x.key !== c.key))} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <Label>Tipo do contato *</Label>
                      <Select value={c.type} onValueChange={v => updateContact(c.key, "type", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONTACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>Número *</Label>
                      <Input placeholder="(11) 91234-5678" value={c.phone} onChange={e => updateContact(c.key, "phone", e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>Este número é WhatsApp?</Label>
                      <Select value={c.isWhatsapp ? "sim" : "nao"} onValueChange={v => updateContact(c.key, "isWhatsapp", v === "sim")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sim">Sim</SelectItem>
                          <SelectItem value="nao">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>Observações</Label>
                      <Input placeholder="Observações sobre este contato" value={c.notes} onChange={e => updateContact(c.key, "notes", e.target.value)} />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setContacts(prev => [...prev, emptyContact()])} className="text-center text-sm font-medium text-primary hover:underline">
                  + Adicionar outro contato
                </button>
              </div>
            )}

            {/* Step 3: Address */}
            {step === 3 && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <Label>CEP</Label>
                  <div className="relative">
                    <Input placeholder="00000-000" value={cep} onChange={e => handleCepChange(e.target.value)} maxLength={9} />
                    {cepLoading && <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                  </div>
                  {cepError ? (
                    <p className="flex items-center gap-1 text-[11px] text-destructive"><AlertCircle className="h-3 w-3" /> {cepError}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Digite o CEP para preencher o endereço automaticamente.</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Endereço</Label>
                  <Input placeholder="Rua / Avenida" value={addressStreet} onChange={e => setAddressStreet(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label>Número</Label>
                    <Input placeholder="Número" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Complemento</Label>
                    <Input placeholder="Apto, sala..." value={addressComplement} onChange={e => setAddressComplement(e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Bairro</Label>
                  <Input placeholder="Bairro" value={addressNeighborhood} onChange={e => setAddressNeighborhood(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Cidade</Label>
                  <Input placeholder="Cidade" value={addressCity} onChange={e => setAddressCity(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Estado</Label>
                  <Select value={addressState} onValueChange={setAddressState}>
                    <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>
                      {STATES.map(s => <SelectItem key={s.uf} value={s.uf}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Ponto de referência</Label>
                  <Input placeholder="Próximo a..." value={addressReference} onChange={e => setAddressReference(e.target.value)} />
                </div>
              </div>
            )}

            {/* Step 4: Additional info */}
            {step === 4 && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Marcações</Label>
                    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
                      {tags.map(t => (
                        <span key={t} className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          {t}
                          <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))}>
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                      <input
                        className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        placeholder={tags.length === 0 ? 'Ex: "Bom pagador", "Cliente fiel"' : ""}
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={handleTagKey}
                        onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Pressione Enter para adicionar.</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Observações</Label>
                    <Textarea placeholder="Observações sobre este cliente..." value={extraNotes} onChange={e => setExtraNotes(e.target.value)} rows={3} />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <h2 className="text-sm font-semibold">Privacidade</h2>
                  <p className="text-[11px] text-muted-foreground -mt-2">Recomendamos perguntar ao cliente se aceita receber comunicações automáticas.</p>
                  {[
                    { label: "Aceita receber E-mails?",      val: acceptEmail,       set: setAcceptEmail },
                    { label: "Aceita receber SMS?",           val: acceptSms,         set: setAcceptSms },
                    { label: "Aceita receber Campanha SMS?",  val: acceptCampaignSms, set: setAcceptCampaignSms },
                    { label: "Aceita receber WhatsApp?",      val: acceptWhatsapp,    set: setAcceptWhatsapp },
                  ].map(({ label, val, set }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm">{label}</span>
                      <Switch checked={val} onCheckedChange={set} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Animals */}
            {step === 5 && (
              <div className="flex flex-col gap-4">
                {animals.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <PawPrint className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Adicione animais ao cadastro</p>
                    <p className="text-xs text-muted-foreground">Clique no botão abaixo para adicionar</p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {animals.map(a => {
                      const sp = SPECIES_OPTIONS.find(s => s.value === a.species)
                      return (
                        <li key={a.key} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                          <span className="text-xl">{sp?.emoji ?? "🐾"}</span>
                          <div className="flex min-w-0 flex-1 flex-col leading-tight">
                            <span className="truncate text-sm font-medium">{a.name}</span>
                            <span className="truncate text-xs text-muted-foreground">
                              {sp?.label} {a.breed ? `· ${a.breed}` : ""} · {a.sex === "M" ? "Macho" : "Fêmea"}
                            </span>
                          </div>
                          <button type="button" onClick={() => setAnimals(prev => prev.filter(x => x.key !== a.key))} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={openNewAnimal}
                  className="w-full rounded-full border border-primary py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                >
                  Adicionar novo animal
                </button>
              </div>
            )}
          </div>

          {/* Footer navigation */}
          <div className="flex flex-col gap-2 border-t border-border px-6 py-4 shrink-0">
            {step < TOTAL_STEPS ? (
              <Button onClick={() => { if (canAdvance()) setStep(s => s + 1) }} disabled={!canAdvance()} className="w-full rounded-full">
                Avançar
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving} className="w-full rounded-full bg-green-600 hover:bg-green-700 text-white">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
            {step > 1 && (
              <Button type="button" variant="ghost" onClick={() => setStep(s => s - 1)} disabled={saving} className="w-full">
                Voltar
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Animal sub-dialog */}
      <Dialog open={animalDialog} onOpenChange={setAnimalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo animal</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Thor"
                value={editingAnimal.name}
                onChange={e => setEditingAnimal(prev => ({ ...prev, name: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label>Espécie *</Label>
                <Select value={editingAnimal.species} onValueChange={v => setEditingAnimal(prev => ({ ...prev, species: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPECIES_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.emoji} {s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Raça</Label>
                <Input placeholder="Ex: Golden" value={editingAnimal.breed} onChange={e => setEditingAnimal(prev => ({ ...prev, breed: e.target.value }))} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Sexo *</Label>
              <RadioGroup value={editingAnimal.sex} onValueChange={v => setEditingAnimal(prev => ({ ...prev, sex: v }))} className="flex gap-4">
                <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                  <RadioGroupItem value="M" /> Macho
                </Label>
                <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                  <RadioGroupItem value="F" /> Fêmea
                </Label>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label>Nascimento</Label>
                <Input type="date" value={editingAnimal.birthDate} onChange={e => setEditingAnimal(prev => ({ ...prev, birthDate: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.1" min="0" placeholder="Ex: 12.5" value={editingAnimal.weightKg} onChange={e => setEditingAnimal(prev => ({ ...prev, weightKg: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label>Pelagem / cor</Label>
                <Input placeholder="Ex: Caramelo" value={editingAnimal.color} onChange={e => setEditingAnimal(prev => ({ ...prev, color: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Microchip</Label>
                <Input placeholder="15 dígitos" value={editingAnimal.microchip} onChange={e => setEditingAnimal(prev => ({ ...prev, microchip: e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5">
              <span className="text-sm">Castrado</span>
              <Switch checked={editingAnimal.neutered} onCheckedChange={v => setEditingAnimal(prev => ({ ...prev, neutered: v }))} />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Alergias</Label>
              <Input placeholder="Ex: Frango, anti-inflamatórios (separe por vírgula)" value={editingAnimal.allergies} onChange={e => setEditingAnimal(prev => ({ ...prev, allergies: e.target.value }))} />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Condições crônicas</Label>
              <Input placeholder="Ex: Doença renal, artrose (separe por vírgula)" value={editingAnimal.chronicConditions} onChange={e => setEditingAnimal(prev => ({ ...prev, chronicConditions: e.target.value }))} />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setAnimalDialog(false)}>Cancelar</Button>
              <Button onClick={saveAnimal} disabled={!editingAnimal.name.trim()}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
