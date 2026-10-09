import { useState } from 'react'
import { Building2, Check, ChevronsUpDown, Crown, Loader2, Lock, Share2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ErrorState, InlineLoading } from '@/components/common/States'
import { Hint } from '@/components/common/Hint'
import { notify } from '@/lib/notify'
import {
  CONTEXT_ACCESS_HINTS,
  CONTEXT_ACCESS_LABELS,
  CONTEXT_ACCESS_ORDER,
  GENERAL_ACCESS_HINTS,
  GENERAL_ACCESS_LABELS,
} from '@/lib/contextAccess'
import {
  useContextSharing,
  useSetGeneralAccess,
  useShareablePeople,
  useShareContext,
  useUnshareContext,
} from '@/hooks/useMetadataLakehouse'
import type {
  ContextAccessLevel,
  ContextSharePerson,
  GeneralAccess,
} from '@/types/metadataLakehouse'

export function ContextShareDialog({
  connectionId,
  name,
  open,
  onOpenChange,
}: {
  connectionId: string | null
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-4" aria-hidden />
            Share {name}
          </DialogTitle>
          <DialogDescription>
            Choose who in your company can open this context — its draft and every published
            version — and what they can do with it.
          </DialogDescription>
        </DialogHeader>
        {open && connectionId ? <ShareBody connectionId={connectionId} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function personName(p: Pick<ContextSharePerson, 'displayName' | 'username'>): string {
  return p.displayName || p.username
}

function ShareBody({ connectionId }: { connectionId: string }) {
  const sharing = useContextSharing(connectionId)
  const canShare = Boolean(sharing.data?.you.canShare)
  const people = useShareablePeople(connectionId, canShare)
  const share = useShareContext(connectionId)
  const unshare = useUnshareContext(connectionId)
  const general = useSetGeneralAccess(connectionId)

  const [person, setPerson] = useState<ContextSharePerson | null>(null)
  const [level, setLevel] = useState<ContextAccessLevel>('view')
  const [pendingUser, setPendingUser] = useState<number | null>(null)

  if (sharing.isError) {
    return <ErrorState error={sharing.error} onRetry={() => sharing.refetch()} compact />
  }
  if (!sharing.data) {
    return <InlineLoading label="Loading who has access…" />
  }

  const { owner, people: holders, generalAccess } = sharing.data
  const holderIds = new Set(holders.map((h) => h.userId))
  const candidates = (people.data ?? []).filter((p) => !holderIds.has(p.userId))

  const add = async () => {
    if (!person) return
    try {
      await share.mutateAsync({ userId: person.userId, level })
      notify.success(`${personName(person)} ${CONTEXT_ACCESS_LABELS[level].toLowerCase()} this context.`)
      setPerson(null)
    } catch (err) {
      notify.failure('share this context', err)
    }
  }

  const change = async (userId: number, who: string, next: ContextAccessLevel) => {
    setPendingUser(userId)
    try {
      await share.mutateAsync({ userId, level: next })
      notify.success(`${who} now ${CONTEXT_ACCESS_LABELS[next].toLowerCase()} this context.`)
    } catch (err) {
      notify.failure('change that access', err)
    } finally {
      setPendingUser(null)
    }
  }

  const remove = async (userId: number, who: string) => {
    setPendingUser(userId)
    try {
      await unshare.mutateAsync(userId)
      notify.success(`${who} can no longer open this context.`)
    } catch (err) {
      notify.failure('remove that access', err)
    } finally {
      setPendingUser(null)
    }
  }

  const setGeneral = async (next: GeneralAccess) => {
    try {
      await general.mutateAsync(next)
      notify.success(`General access is now "${GENERAL_ACCESS_LABELS[next]}".`)
    } catch (err) {
      notify.failure('change general access', err)
    }
  }

  return (
    <div className="space-y-5">
      {canShare ? (
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9.5rem]">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Person</Label>
              <PersonPicker
                people={candidates}
                loading={people.isPending}
                value={person}
                onChange={setPerson}
                disabled={share.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="context-share-level" className="text-xs font-medium">
                They can
              </Label>
              <LevelSelect id="context-share-level" value={level} onChange={setLevel} disabled={share.isPending} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{CONTEXT_ACCESS_HINTS[level]}</p>
            <Button size="sm" onClick={() => void add()} disabled={share.isPending || !person}>
              {share.isPending && pendingUser === null ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Share
            </Button>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
          Only the person who created this context can change who has access.
        </p>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold">People with access</h3>
        <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border">
          <li className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {owner?.name ?? 'Its creator is no longer a user'}
                {sharing.data.you.isOwner ? (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
                ) : null}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Created this context · company admins also have full access
              </span>
            </span>
            <Badge variant="outline" className="shrink-0 gap-1 font-medium">
              <Crown className="size-3" aria-hidden />
              Owner
            </Badge>
          </li>
          {holders.map((h) => {
            const who = personName(h)
            const pending = pendingUser === h.userId
            return (
              <li key={h.userId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {who}
                    {!h.active ? (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">(deactivated)</span>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{h.email}</span>
                </span>
                {canShare ? (
                  <span className="flex shrink-0 items-center gap-1">
                    <LevelSelect
                      value={h.level}
                      onChange={(next) => next !== h.level && void change(h.userId, who, next)}
                      disabled={pending}
                      compact
                      label={`Access for ${who}`}
                    />
                    <Hint label={`Remove ${who}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        disabled={pending}
                        aria-label={`Remove ${who}`}
                        onClick={() => void remove(h.userId, who)}
                      >
                        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <X className="size-4" aria-hidden />}
                      </Button>
                    </Hint>
                  </span>
                ) : (
                  <Badge variant="outline" className="shrink-0 font-medium">
                    {CONTEXT_ACCESS_LABELS[h.level]}
                  </Badge>
                )}
              </li>
            )
          })}
        </ul>
        {holders.length === 0 ? (
          <p className="mt-1.5 text-xs text-muted-foreground">Nobody has been added yet.</p>
        ) : null}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">General access</h3>
        <div className="flex items-start gap-3 rounded-lg border px-3 py-2.5">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            {generalAccess === 'company' ? (
              <Building2 className="size-4" aria-hidden />
            ) : (
              <Lock className="size-4" aria-hidden />
            )}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            {canShare ? (
              <Select
                value={generalAccess}
                onValueChange={(v) => v !== generalAccess && void setGeneral(v as GeneralAccess)}
                disabled={general.isPending}
              >
                <SelectTrigger className="h-8 w-full sm:w-64" aria-label="General access">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(GENERAL_ACCESS_LABELS) as GeneralAccess[]).map((g) => (
                    <SelectItem key={g} value={g}>
                      {GENERAL_ACCESS_LABELS[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm font-medium">{GENERAL_ACCESS_LABELS[generalAccess]}</p>
            )}
            <p className="text-xs text-muted-foreground">{GENERAL_ACCESS_HINTS[generalAccess]}</p>
          </div>
        </div>
      </section>
    </div>
  )
}

function LevelSelect({
  id,
  value,
  onChange,
  disabled,
  compact = false,
  label,
}: {
  id?: string
  value: ContextAccessLevel
  onChange: (level: ContextAccessLevel) => void
  disabled?: boolean
  compact?: boolean
  label?: string
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ContextAccessLevel)} disabled={disabled}>
      <SelectTrigger id={id} className={compact ? 'h-8 w-[8.5rem]' : 'w-full'} aria-label={label}>
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

function PersonPicker({
  people,
  loading,
  value,
  onChange,
  disabled,
}: {
  people: ContextSharePerson[]
  loading: boolean
  value: ContextSharePerson | null
  onChange: (person: ContextSharePerson) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Choose a person"
          disabled={disabled}
          className="w-full justify-between gap-2 font-normal"
        >
          <span className="truncate">
            {value ? (
              personName(value)
            ) : (
              <span className="text-muted-foreground">
                {loading ? 'Loading colleagues…' : people.length ? 'Choose a colleague…' : 'Everyone already has access'}
              </span>
            )}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0">
        <Command>
          <CommandInput placeholder="Search by name or email…" />
          <CommandList>
            <CommandEmpty>{loading ? 'Loading colleagues…' : 'Nobody matches that.'}</CommandEmpty>
            <CommandGroup>
              {people.map((p) => (
                <CommandItem
                  key={p.userId}
                  value={`${personName(p)} ${p.username} ${p.email} ${p.userId}`}
                  onSelect={() => {
                    onChange(p)
                    setOpen(false)
                  }}
                  className="gap-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{personName(p)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p.email}</span>
                  </span>
                  {value?.userId === p.userId ? <Check className="size-4" aria-hidden /> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
