"use client"

import { useRouter } from "next/navigation"
import { Bell, Check, CheckCheck, Calendar, Info } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { useNotifications } from "@/hooks/use-notifications"
import type { AppNotification } from "@/lib/types"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

const TYPE_ICON: Record<AppNotification["type"], React.ReactNode> = {
  appointment_assigned: <Calendar className="h-4 w-4 text-primary" strokeWidth={1.75} />,
  appointment_updated: <Calendar className="h-4 w-4 text-amber-500" strokeWidth={1.75} />,
  appointment_cancelled: <Calendar className="h-4 w-4 text-destructive" strokeWidth={1.75} />,
  general: <Info className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />,
}

export function NotificationPanel() {
  const router = useRouter()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()

  const handleClick = (n: AppNotification) => {
    if (!n.read) markRead(n.id)
    if (n.link) router.push(n.link)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label="Notificações">
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
              Marcar todas como lidas
            </button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.25} />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      !n.read && "bg-primary/5"
                    )}
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                      {TYPE_ICON[n.type]}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn("text-xs font-medium leading-tight", !n.read && "text-foreground")}>
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                      <span className="text-[11px] text-muted-foreground/70">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="border-t border-border px-4 py-2">
            <button
              type="button"
              onClick={markAllRead}
              className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={1.75} />
              Limpar todas
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
