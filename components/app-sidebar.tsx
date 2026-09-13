"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useState, createContext, useContext } from "react"
import {
  LayoutDashboard,
  PawPrint,
  CalendarDays,
  KanbanSquare,
  FileText,
  Stethoscope,
  Pill,
  Receipt,
  Users,
  Settings,
  LifeBuoy,
  Scissors,
  HeartPulse,
  LogOut,
  Moon,
  Sun,
  ImageIcon,
  DollarSign,
  FolderOpen,
  ChevronDown,
  ChevronLeft,
} from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/use-permissions"
import type { Permission } from "@/lib/permissions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { listFichas } from "@/lib/api"

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      className={className}
      viewBox="0 0 16 16"
    >
      <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
    </svg>
  )
}

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  disabled?: boolean
  requires?: Permission
  children?: NavItem[]
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, requires: "dashboard_view" },
  { href: "/atendimentos", label: "Atendimentos", icon: KanbanSquare, requires: "consultations_view" },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, requires: "agenda_view" },
]

const PATIENTS_NAV: NavItem[] = [
  { href: "/pacientes", label: "Pacientes", icon: PawPrint, requires: "patients_view" },
  { href: "/fichas", label: "Fichas Abertas", icon: FolderOpen, requires: "fichas_view" },
]

const PROCEDURES_NAV: NavItem[] = [
  { href: "/consultorio", label: "Consultas", icon: FileText, badge: "IA", requires: "consultations_ai" },
  { href: "/exames-imagens", label: "Exames de Imagens", icon: ImageIcon, badge: "IA", requires: "image_exams_view" },
  { href: "/cirurgias", label: "Cirurgias", icon: Scissors, requires: "surgeries_view" },
  { href: "/internacao", label: "Internação", icon: HeartPulse, requires: "hospitalizations_view" },
]

const CLINIC_NAV: NavItem[] = [
  { href: "/whatsapp", label: "WhatsApp", icon: WhatsAppIcon, requires: "whatsapp_view" },
  { href: "/estoque", label: "Estoque", icon: Pill, requires: "inventory_view" },
  { href: "/financeiro", label: "Financeiro", icon: Receipt, requires: "financial_view" },
  { href: "/equipe", label: "Equipe", icon: Users, requires: "team_view" },
  { href: "/relatorios", label: "Relatórios", icon: Stethoscope, disabled: true, requires: "financial_reports" },
]

const CollapsedCtx = createContext(false)

function NavLink({ item, active, indent }: { item: NavItem; active: boolean; indent?: boolean }) {
  const collapsed = useContext(CollapsedCtx)
  const Icon = item.icon

  if (collapsed) {
    const collapsedCls = cn(
      "flex items-center justify-center rounded-md p-2 transition-colors relative",
      active
        ? "bg-accent text-accent-foreground"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      item.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-sidebar-foreground",
    )

    const iconEl = (
      <>
        <Icon className="h-5 w-5 shrink-0" />
        {item.badge && (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white" />
        )}
      </>
    )

    if (item.disabled) {
      return <div className={collapsedCls} title={item.label} aria-disabled="true">{iconEl}</div>
    }

    return (
      <Link href={item.href} className={collapsedCls} title={item.label}>
        {iconEl}
      </Link>
    )
  }

  const className = cn(
    "group flex items-center gap-2.5 rounded-md py-1.5 text-sm transition-colors",
    indent ? "pl-7 pr-2.5" : "px-2.5",
    active
      ? "bg-accent text-accent-foreground font-medium"
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    item.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-sidebar-foreground",
  )

  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-primary">
          {item.badge}
        </span>
      )}
    </>
  )

  if (item.disabled) {
    return <div className={className} aria-disabled="true">{content}</div>
  }

  return (
    <Link href={item.href} className={className}>
      {content}
    </Link>
  )
}

function NavItemWithChildren({
  item,
  pathname,
  defaultOpen,
}: {
  item: NavItem
  pathname: string
  defaultOpen: boolean
}) {
  const collapsed = useContext(CollapsedCtx)
  const [open, setOpen] = useState(defaultOpen)
  const Icon = item.icon
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  const childActive = item.children?.some(c => pathname.startsWith(c.href)) ?? false
  const highlighted = active || childActive

  if (collapsed) {
    return (
      <Link
        href={item.href}
        title={item.label}
        className={cn(
          "flex items-center justify-center rounded-md p-2 transition-colors",
          highlighted
            ? "bg-accent text-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
      </Link>
    )
  }

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
          highlighted
            ? "bg-accent text-accent-foreground font-medium"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <Link href={item.href} className="flex min-w-0 flex-1 items-center gap-2.5">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-primary">
              {item.badge}
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="rounded p-0.5 text-sidebar-foreground/50 hover:text-sidebar-foreground"
          aria-label={open ? "Recolher" : "Expandir"}
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </div>

      {open && (
        <div className="mt-0.5 flex flex-col gap-0.5 border-l border-border/50 ml-[18px] pl-3">
          {item.children!.map(child => {
            const cActive = pathname.startsWith(child.href)
            return <NavLink key={child.href} item={child} active={cActive} />
          })}
        </div>
      )}
    </div>
  )
}

function NavGroup({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  const collapsed = useContext(CollapsedCtx)

  return (
    <div className="flex flex-col gap-0.5">
      {!collapsed && (
        <div className="px-2.5 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/70">
          {label}
        </div>
      )}
      {collapsed && <div className="pt-3" />}
      {items.map((item) => {
        if (item.children && item.children.length > 0) {
          const defaultOpen = pathname.startsWith(item.href) ||
            item.children.some(c => pathname.startsWith(c.href))
          return (
            <NavItemWithChildren
              key={item.href}
              item={item}
              pathname={pathname}
              defaultOpen={defaultOpen}
            />
          )
        }
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
        return <NavLink key={item.href} item={item} active={active} />
      })}
    </div>
  )
}

export function AppSidebar() {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const { tenant, user, logout } = useAuth()
  const { has } = usePermissions()
  const [fichasAbertasCount, setFichasAbertasCount] = useState(0)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed")
    if (stored === "true") setCollapsed(true)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem("sidebar-collapsed", String(next))
      return next
    })
  }

  useEffect(() => {
    Promise.all([
      listFichas({ status: "aberto" }),
      listFichas({ status: "aguardando_cobranca" }),
    ])
      .then(([abertas, cobranca]) => {
        setFichasAbertasCount(abertas.length + cobranca.length)
      })
      .catch(() => {})
  }, [pathname])

  const visibleItem = (i: NavItem) => !i.requires || has(i.requires)
  const primaryNav = PRIMARY_NAV.filter(visibleItem)
  const patientsNav = PATIENTS_NAV.filter(visibleItem).map(i =>
    i.href === "/fichas" && fichasAbertasCount > 0
      ? { ...i, badge: String(fichasAbertasCount) }
      : i
  )
  const proceduresNav = PROCEDURES_NAV.filter(visibleItem)
  const clinicNav = CLINIC_NAV.filter(visibleItem)

  const initials = user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U"

  return (
    <CollapsedCtx.Provider value={collapsed}>
      <aside
        className={cn(
          "sticky top-0 hidden h-svh shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 md:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            "flex h-14 items-center border-b border-border",
            collapsed ? "justify-center px-0" : "gap-2 px-4",
          )}
        >
          <Image
            src="/logo_white.png"
            alt="Pupify"
            width={25}
            height={25}
            className="h-5 w-5 shrink-0 rounded"
          />
          {!collapsed && (
            <>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="text-sm font-semibold tracking-tight text-white">Pupify</span>
                <span className="truncate text-[10px] text-white/70">{tenant?.name}</span>
              </div>
              <button
                type="button"
                onClick={toggleCollapsed}
                className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                title="Recolher menu"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
          {collapsed && (
            <div className="flex justify-center pb-1 pt-2">
              <button
                type="button"
                onClick={toggleCollapsed}
                className="rounded-md p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                title="Expandir menu"
              >
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </button>
            </div>
          )}
          {primaryNav.length > 0 && (
            <NavGroup label="Operação" items={primaryNav} pathname={pathname} />
          )}
          {patientsNav.length > 0 && (
            <NavGroup label="Pacientes" items={patientsNav} pathname={pathname} />
          )}
          {proceduresNav.length > 0 && (
            <NavGroup label="Clínico" items={proceduresNav} pathname={pathname} />
          )}
          {clinicNav.length > 0 && (
            <NavGroup label="Gestão" items={clinicNav} pathname={pathname} />
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex w-full items-center rounded-md border border-border bg-background transition-colors hover:bg-muted/40 data-[state=open]:bg-muted/40",
                collapsed ? "justify-center p-1.5" : "gap-2.5 p-2",
              )}
              title={collapsed ? (user?.name || "Usuário") : undefined}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials}
              </div>
              {!collapsed && (
                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-xs font-medium">{user?.name || "Usuário"}</span>
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48">
              <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
                <Sun className="h-4 w-4" />
                <span>Modo claro</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
                <Moon className="h-4 w-4" />
                <span>Modo escuro</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
                <Settings className="h-4 w-4" />
                <span>Sistema</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild disabled>
                <Link href="/ajuda" className="cursor-pointer">
                  <LifeBuoy className="h-4 w-4" />
                  <span>Ajuda</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/configuracoes" className="cursor-pointer">
                  <Settings className="h-4 w-4" />
                  <span>Configurações</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </CollapsedCtx.Provider>
  )
}
