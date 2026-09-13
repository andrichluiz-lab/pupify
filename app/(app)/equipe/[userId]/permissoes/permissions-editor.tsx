'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  type Permission,
  type UserPermissionOverride,
  type UserPermissionsResponse,
} from '@/lib/permissions'
import { saveUserPermissionsAction } from './actions'

interface Props {
  data: UserPermissionsResponse
}

export function PermissionsEditor({ data }: Props) {
  const defaultSet = useMemo(() => new Set<Permission>(data.defaults), [data.defaults])
  const effectiveSet = useMemo(() => new Set<Permission>(data.effective), [data.effective])

  // Local "granted" state per permission (initialised from effective)
  const [granted, setGranted] = useState<Record<Permission, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const group of PERMISSION_GROUPS) {
      for (const perm of group.permissions) {
        initial[perm] = effectiveSet.has(perm)
      }
    }
    return initial as Record<Permission, boolean>
  })
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  function toggle(perm: Permission) {
    setGranted((prev) => ({ ...prev, [perm]: !prev[perm] }))
    setFeedback(null)
  }

  function resetToDefaults() {
    const next: Record<string, boolean> = {}
    for (const group of PERMISSION_GROUPS) {
      for (const perm of group.permissions) {
        next[perm] = defaultSet.has(perm)
      }
    }
    setGranted(next as Record<Permission, boolean>)
    setFeedback(null)
  }

  function isModified(perm: Permission) {
    return granted[perm] !== defaultSet.has(perm)
  }

  async function handleSave() {
    // Only send permissions that differ from the role default — the backend
    // also dedupes, but trimming here keeps the payload small.
    const overrides: UserPermissionOverride[] = []
    for (const group of PERMISSION_GROUPS) {
      for (const perm of group.permissions) {
        if (granted[perm] !== defaultSet.has(perm)) {
          overrides.push({ permission: perm, granted: granted[perm] })
        }
      }
    }

    startTransition(async () => {
      const result = await saveUserPermissionsAction(data.userTenant.id, overrides)
      if (result.success) {
        setFeedback({ kind: 'ok', text: 'Permissões salvas. O usuário verá a alteração no próximo refresh.' })
      } else {
        setFeedback({ kind: 'err', text: result.error || 'Falha ao salvar' })
      }
    })
  }

  const modifiedCount = Object.entries(granted).filter(([p]) => isModified(p as Permission)).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/equipe"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para equipe
        </Link>
        <div className="flex items-center gap-2">
          {modifiedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {modifiedCount} alteração(ões)
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            disabled={pending}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar padrão
          </Button>
          <Button size="sm" onClick={handleSave} disabled={pending}>
            <Save className="h-3.5 w-3.5" />
            {pending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={
            'rounded-md border px-3 py-2 text-xs ' +
            (feedback.kind === 'ok'
              ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300'
              : 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300')
          }
        >
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PERMISSION_GROUPS.map((group) => (
          <div
            key={group.module}
            className="overflow-hidden rounded-lg border border-border bg-card"
          >
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium">{group.label}</h2>
            </div>
            <div className="flex flex-col">
              {group.permissions.map((perm) => {
                const modified = isModified(perm)
                const isDefault = defaultSet.has(perm)
                return (
                  <label
                    key={perm}
                    className="flex items-start gap-3 border-b border-border px-4 py-2.5 last:border-b-0 hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={granted[perm]}
                      onCheckedChange={() => toggle(perm)}
                      className="mt-0.5"
                    />
                    <div className="flex min-w-0 flex-1 flex-col leading-tight">
                      <span className="truncate text-sm">{PERMISSION_LABELS[perm]}</span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {perm}
                        {!isDefault && ' • não padrão da role'}
                      </span>
                    </div>
                    {modified && (
                      <Badge variant="outline" className="ml-auto text-[10px]">
                        modificado
                      </Badge>
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
