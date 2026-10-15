import { useMemo, useState } from 'react'
import { Layers, Loader2, X } from 'lucide-react'
import { fetchGroupContexts } from '@/api/workspace.api'
import { listConnections } from '@/api/connection.api'
import { shareContextWithGroup, unshareContextWithGroup } from '@/api/contextAccess.api'
import { useAsync } from '@/hooks/useAsync'
import { Section } from '@/components/common/Page'
import { EmptyState, ErrorState, InlineLoading } from '@/components/common/States'
import { Hint } from '@/components/common/Hint'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { notify } from '@/lib/notify'
import { CONTEXT_ACCESS_HINTS, CONTEXT_ACCESS_LABELS, CONTEXT_ACCESS_ORDER } from '@/lib/contextAccess'
import type { Group } from '@/types/admin'
import type { ContextAccessLevel, GroupSharedContext } from '@/types/metadataLakehouse'

function LevelSelect({
  value,
  onChange,
  disabled,
  label,
}: {
  value: ContextAccessLevel
  onChange: (level: ContextAccessLevel) => void
  disabled?: boolean
  label: string
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ContextAccessLevel)} disabled={disabled}>
      <SelectTrigger className="w-[8.5rem]" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CONTEXT_ACCESS_ORDER.map((l) => (
          <SelectItem key={l} value={l}>
            {CONTEXT_ACCESS_LABELS[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function contextTitle(context: Pick<GroupSharedContext, 'name' | 'publishedVersion'>): string {
  return context.publishedVersion ? `${context.name} v${context.publishedVersion}` : context.name
}

export function GroupContexts({ group }: { group: Group }) {
  const shared = useAsync(() => fetchGroupContexts(group.id), [group.id])
  const connections = useAsync(() => listConnections(), [])
  const [connectionId, setConnectionId] = useState('')
  const [level, setLevel] = useState<ContextAccessLevel>('view')
  const [adding, setAdding] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const manageable = useMemo(
    () => new Set((connections.data ?? []).filter((c) => c.access?.canShare).map((c) => c.id)),
    [connections.data]
  )
  const sharedIds = new Set((shared.data ?? []).map((s) => s.connectionId))
  const candidates = (connections.data ?? []).filter(
    (c) => c.access?.canShare && c.published && c.companyId === group.companyId && !sharedIds.has(c.id)
  )
  const chosen = candidates.find((c) => c.id === connectionId) ?? null

  const add = async () => {
    if (!chosen) return
    setAdding(true)
    try {
      await shareContextWithGroup(chosen.id, group.id, level)
      notify.success(
        `${group.name} ${CONTEXT_ACCESS_LABELS[level].toLowerCase()} ${chosen.published?.name ?? chosen.name}.`,
        'Every active member of the group has it now.'
      )
      setConnectionId('')
      shared.reload()
    } catch (err) {
      notify.failure('share that context with the group', err)
    } finally {
      setAdding(false)
    }
  }

  const change = async (context: GroupSharedContext, next: ContextAccessLevel) => {
    setPendingId(context.connectionId)
    try {
      await shareContextWithGroup(context.connectionId, group.id, next)
      notify.success(`${group.name} now ${CONTEXT_ACCESS_LABELS[next].toLowerCase()} ${context.name}.`)
      shared.reload()
    } catch (err) {
      notify.failure('change that access', err)
    } finally {
      setPendingId(null)
    }
  }

  const remove = async (context: GroupSharedContext) => {
    setPendingId(context.connectionId)
    try {
      await unshareContextWithGroup(context.connectionId, group.id)
      notify.success(`${group.name} can no longer open ${context.name}.`)
      shared.reload()
    } catch (err) {
      notify.failure('remove that access', err)
    } finally {
      setPendingId(null)
    }
  }

  const rows = shared.data ?? []

  return (
    <Section
      title="Shared contexts"
      description="Published Metadata Lakehouse contexts this group can open. Every active member gets the same access."
      flush
    >
      {group.active ? (
        <div className="space-y-2 border-b border-border px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={connectionId} onValueChange={setConnectionId} disabled={adding}>
              <SelectTrigger className="min-w-0 flex-1" aria-label="Choose a published context">
                <SelectValue
                  placeholder={
                    connections.loading
                      ? 'Loading contexts…'
                      : candidates.length
                        ? 'Choose a published context…'
                        : 'No other context you can share'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.published ? `${c.published.name} ${c.published.label}` : c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <LevelSelect value={level} onChange={setLevel} disabled={adding} label="Access for the group" />
            <Button size="sm" onClick={() => void add()} disabled={!chosen || adding}>
              {adding ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Share
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {CONTEXT_ACCESS_HINTS[level]} You can share the contexts you created.
          </p>
        </div>
      ) : (
        <p className="border-b border-border px-5 py-3 text-xs text-muted-foreground">
          This group is paused. Resume it to share contexts with its members.
        </p>
      )}

      {shared.error ? (
        <ErrorState error={shared.error} title="Unable to load shared contexts" onRetry={shared.reload} compact />
      ) : shared.loading ? (
        <InlineLoading label="Loading shared contexts…" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No context shared yet"
          body="Share a published context above and every member can open it at once."
          compact
        />
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((context) => {
            const pending = pendingId === context.connectionId
            const canManage = manageable.has(context.connectionId)
            return (
              <li key={context.connectionId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Layers className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{contextTitle(context)}</span>
                    <span className="block truncate text-xs capitalize text-muted-foreground">
                      {context.publishedVersion ? context.provider : `${context.provider} · not published yet`}
                    </span>
                  </span>
                </span>
                {canManage ? (
                  <span className="flex shrink-0 items-center gap-1">
                    <LevelSelect
                      value={context.level}
                      onChange={(next) => next !== context.level && void change(context, next)}
                      disabled={pending}
                      label={`Access to ${context.name}`}
                    />
                    <Hint label={`Stop sharing ${context.name}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        disabled={pending}
                        aria-label={`Stop sharing ${context.name}`}
                        onClick={() => void remove(context)}
                      >
                        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <X className="size-4" aria-hidden />}
                      </Button>
                    </Hint>
                  </span>
                ) : (
                  <Badge variant="outline" className="shrink-0 font-medium">
                    {CONTEXT_ACCESS_LABELS[context.level]}
                  </Badge>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}
