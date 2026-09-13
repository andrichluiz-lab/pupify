"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, X, User, PawPrint } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationPanel } from "@/components/notifications/notification-panel"
import { searchPatients, searchTutors } from "@/lib/api"
import type { Patient, Tutor } from "@/lib/types"

type ActionOption = {
  label: string
  href: string
  icon?: React.ReactNode
}

type Props = {
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
    dropdownOptions?: ActionOption[]
  }
}

export function AppTopbar({ title, description, action }: Props) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ patients: Patient[]; tutors: Tutor[] }>({ patients: [], tutors: [] })
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false)
        searchInputRef.current?.blur()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Search functionality
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults({ patients: [], tutors: [] })
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const [patients, tutors] = await Promise.all([
          searchPatients(searchQuery),
          searchTutors(searchQuery),
        ])
        setSearchResults({ patients, tutors })
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [searchQuery])

  const handleClearSearch = () => {
    setSearchQuery("")
    setSearchResults({ patients: [], tutors: [] })
    searchInputRef.current?.focus()
  }

  const handleSelectPatient = (patientId: string) => {
    router.push(`/pacientes/${patientId}`)
    setIsSearchOpen(false)
    setSearchQuery("")
  }

  const handleSelectTutor = (tutorId: string) => {
    router.push(`/tutores/${tutorId}`)
    setIsSearchOpen(false)
    setSearchQuery("")
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex min-w-0 flex-col leading-tight">
          <h1 className="truncate text-sm font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative hidden max-w-xs flex-1 md:block">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={searchInputRef}
          type="search"
          placeholder="Buscar pacientes, tutores..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setIsSearchOpen(true)
          }}
          onFocus={() => setIsSearchOpen(true)}
          className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-12 text-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
          /
        </kbd>

        {/* Search Dropdown */}
        {isSearchOpen && (searchQuery || searchResults.patients.length > 0 || searchResults.tutors.length > 0) && (
          <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Buscando...
                </div>
              ) : (
                <>
                  {searchResults.patients.length > 0 && (
                    <div className="p-2">
                      <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Pacientes
                      </p>
                      {searchResults.patients.map((patient) => (
                        <button
                          key={patient.id}
                          type="button"
                          onClick={() => handleSelectPatient(patient.id)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-muted"
                        >
                          <PawPrint className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                          <span className="font-medium">{patient.name}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{patient.species}</span>
                          {patient.tutor && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-muted-foreground">{patient.tutor.name}</span>
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.tutors.length > 0 && (
                    <div className="border-t border-border p-2">
                      <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Tutores
                      </p>
                      {searchResults.tutors.map((tutor) => (
                        <button
                          key={tutor.id}
                          type="button"
                          onClick={() => handleSelectTutor(tutor.id)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-muted"
                        >
                          <User className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                          <span className="font-medium">{tutor.name}</span>
                          {tutor.phone && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-muted-foreground">{tutor.phone}</span>
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {!isLoading && searchResults.patients.length === 0 && searchResults.tutors.length === 0 && searchQuery && (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      Nenhum resultado encontrado
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <NotificationPanel />

      {action && (
        <>
          {action.dropdownOptions ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  {action.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {action.dropdownOptions.map((option) => (
                  <DropdownMenuItem key={option.href} asChild>
                    <Link href={option.href} className="flex items-center gap-2">
                      {option.icon}
                      {option.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" className="h-8 gap-1.5" asChild={!!action.href} onClick={action.onClick}>
              {action.href ? (
                <a href={action.href}>
                  <Plus className="h-3.5 w-3.5" />
                  {action.label}
                </a>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  {action.label}
                </>
              )}
            </Button>
          )}
        </>
      )}
    </header>
  )
}
