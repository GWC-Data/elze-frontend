import { useDeferredValue, useState } from 'react'
import type React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GitBranchPlus, History, Trash2, MoreHorizontal, Pencil, Plug, Search, Share2, Table2, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ErrorState } from '@/components/common/States'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useCompanyPublished, useCreateVersion, useDeleteVersion } from '@/hooks/useMetadataLakehouse'
import { connectorPresentation } from '@/lib/connectors'
import { Pagination } from '@/components/common/Pagination'
import { serverPage } from '@/hooks/usePagination'
import { formatDateTime, formatExact, formatRelativeTime } from '@/lib/format'
import type { Connection, PublishedContextGroup, PublishedVersionEntry } from '@/types/metadataLakehouse'
import { Hint } from '@/components/common/Hint'
import { accessAtLeast } from '@/lib/contextAccess'

const PAGE_SIZE = 10
const PREVIEW = 3

export function PublishedContextsSection({
  connections,
  builderPath,
  datasetsPath,
  publishedPath,
  onMcp,
  onShare,
  search,
}: {
  connections: Connection[]
  builderPath: (connectionId: string) => string
  datasetsPath: (connectionId: string) => string
  publishedPath: (connectionId: string, versionId: string) => string
  onMcp: (connection: Connection) => void
  onShare: (connection: Connection) => void
  search: string
}) {
  const [page, setPage] = useState(1)
  const [pageFor, setPageFor] = useState(search)
  if (search !== pageFor) {
    setPageFor(search)
    setPage(1)
  }
  const query = useDeferredValue(search).trim()
  const published = useCompanyPublished({ page, pageSize: PAGE_SIZE, ...(query ? { search: query } : {}) })
  const data = published.data

  if (published.isError) {
    return (
      <ErrorState
        error={published.error}
        title="Unable to load the published contexts"
        onRetry={() => published.refetch()}
      />
    )
  }
  if (!data) {
    return <div className="h-24 animate-pulse rounded-xl border bg-muted/30" aria-busy="true" />
  }
  if (data.total === 0 && !query) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing published yet. Finish a draft’s Publish step and it appears here.
      </p>
    )
  }

  const byId = new Map(connections.map((c) => [c.id, c]))

  return (
    <div className="space-y-3">
      {data.items.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
          No published context matches “{search}”.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.items.map((group) => (
            <PublishedContextCard
              key={`${group.connectionId}:${group.name}`}
              group={group}
              connection={byId.get(group.connectionId) ?? null}
              builderPath={builderPath(group.connectionId)}
              datasetsPath={datasetsPath(group.connectionId)}
              versionPath={(versionId) => publishedPath(group.connectionId, versionId)}
              onMcp={onMcp}
              onShare={onShare}
            />
          ))}
        </div>
      )}

      <Pagination {...serverPage(page, PAGE_SIZE, data.total)} setPage={setPage} noun="contexts" />
    </div>
  )
}

function PublishedContextCard({
  group,
  connection,
  builderPath,
  datasetsPath,
  versionPath,
  onMcp,
  onShare,
}: {
  group: PublishedContextGroup
  connection: Connection | null
  builderPath: string
  datasetsPath: string
  versionPath: (versionId: string) => string
  onMcp: (connection: Connection) => void
  onShare: (connection: Connection) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const [deleting, setDeleting] = useState<PublishedVersionEntry | null>(null)
  const access = group.access ?? connection?.access ?? null
  const canEdit = accessAtLeast(access, 'edit')
  const canDelete = accessAtLeast(access, 'full')
  const remove = useDeleteVersion()
  const create = useCreateVersion(group.connectionId)
  const navigate = useNavigate()

  const startNewVersion = async () => {
    try {
      const state = await create.mutateAsync()
      notify.success(
        `${state.draft?.label ?? 'A new version'} of ${group.name} opened as a draft.`,
        'The published versions are unchanged.'
      )
      navigate(builderPath)
    } catch (err) {
      notify.failure(`create a new version of ${group.name}`, err)
    }
  }
  const presentation = connectorPresentation(group.provider)
  const live = group.versions[0]
  const editing = connection?.context?.status === 'draft'
  const shown = showAll ? group.versions : group.versions.slice(0, PREVIEW)
  const nextLive = group.versions.find((v) => !v.live) ?? null

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync({ connectionId: group.connectionId, versionId: deleting.id })
      notify.success(`${group.name} ${deleting.label} was deleted.`, 'Every other version is unchanged.')
      setDeleting(null)
    } catch (err) {
      notify.failure(`delete ${group.name} ${deleting.label}`, err)
    }
  }

  const openLive = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (!event.currentTarget.contains(target)) return
    const control = target.closest('a, button, input, [role="menuitem"], [role="dialog"]')
    if (control && control !== event.currentTarget) return
    navigate(versionPath(live.id))
  }

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`Open ${group.name} ${live.label}`}
      onClick={openLive}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          navigate(versionPath(live.id))
        }
      }}
      className="flex cursor-pointer flex-col rounded-xl border bg-card shadow-xs transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <header className="flex items-start gap-3 p-4 pb-3">
        <span
          className={cn('flex size-9 shrink-0 items-center justify-center rounded-md', presentation.accentClass)}
        >
          <presentation.icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 truncate text-sm font-semibold">{group.name}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {group.connectionName} · {group.host}
            {editing && connection?.context ? ` · ${connection.context.label} in progress` : ''}
          </p>
        </div>

        {connection ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Options for ${group.name}`}>
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={() => onMcp(connection)}>
                <Plug aria-hidden />
                MCP connection details
              </DropdownMenuItem>
              {access?.canShare ? (
                <DropdownMenuItem onSelect={() => onShare(connection)}>
                  <Share2 aria-hidden />
                  Share…
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              {editing ? (
                canEdit ? (
                  <DropdownMenuItem asChild>
                    <Link to={builderPath}>
                      <Pencil aria-hidden />
                      Continue the draft
                    </Link>
                  </DropdownMenuItem>
                ) : null
              ) : canEdit ? (
                <DropdownMenuItem disabled={create.isPending} onSelect={() => void startNewVersion()}>
                  <GitBranchPlus aria-hidden />
                  {create.isPending ? 'Creating…' : 'Create new version'}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild>
                <Link to={datasetsPath}>
                  <Table2 aria-hidden />
                  Datasets
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>

      <div className="border-t px-4 py-3">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <History className="size-3" aria-hidden />
          Version history ({group.versions.length})
        </p>
        <ol className="relative space-y-0.5">
          {shown.map((v, i) => (
            <li key={v.id} className="relative flex gap-3 pb-2 last:pb-0">
              <span className="relative flex w-3 shrink-0 justify-center">
                <span
                  className={cn(
                    'mt-1.5 size-2.5 rounded-full ring-2 ring-card',
                    v.live ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                  )}
                  aria-hidden
                />
                {i < shown.length - 1 ? (
                  <span className="absolute top-4 bottom-0 w-px bg-border" aria-hidden />
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link
                    to={versionPath(v.id)}
                    className="font-mono text-xs font-semibold hover:text-primary hover:underline"
                    aria-label={`Open ${group.name} ${v.label}`}
                  >
                    {v.label}
                  </Link>
                  {v.live ? (
                    <Badge className="h-4 bg-emerald-600 px-1.5 text-[10px] hover:bg-emerald-600">Live</Badge>
                  ) : (
                    <Badge variant="outline" className="h-4 px-1.5 text-[10px] text-muted-foreground">
                      Superseded
                    </Badge>
                  )}
                  <Hint label={formatDateTime(v.publishedAt)}><span className="text-xs text-muted-foreground">
                    published {formatRelativeTime(v.publishedAt)}
                  </span></Hint>
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <User className="size-3" aria-hidden />
                    {v.publishedBy ?? 'unknown'}
                  </span>
                  <span>
                    {formatExact(v.objectCount)} fact{v.objectCount === 1 ? '' : 's'}
                  </span>
                </p>
              </div>
              {canDelete ? (
                <Hint label={`Delete ${v.label} only`}><Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${group.name} ${v.label}`}
                  onClick={() => setDeleting(v)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </Button></Hint>
              ) : null}
            </li>
          ))}
        </ol>
        {group.versions.length > PREVIEW ? (
          <Button variant="link" size="sm" className="mt-1 h-auto px-0 text-xs" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show fewer' : `Show all ${group.versions.length} versions`}
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting ? `Delete ${group.name} ${deleting.label}?` : ''}
        body={
          deleting
            ? `Only ${deleting.label} is deleted - its stored snapshot of ${formatExact(deleting.objectCount)} fact${
                deleting.objectCount === 1 ? '' : 's'
              }. Every other version of “${group.name}” and any open draft stay exactly as they are.`
            : ''
        }
        consequence={
          deleting?.live
            ? nextLive
              ? `${deleting.label} is the live version. ${nextLive.label} becomes the live version.`
              : `${deleting.label} is the only version, so “${group.name}” will no longer be listed as published.`
            : undefined
        }
        confirmLabel={deleting ? `Delete ${deleting.label}` : 'Delete'}
        destructive
        pending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </article>
  )
}

export function PublishedSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative w-60">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search contexts…"
        aria-label="Search published contexts by name or connection"
        className="h-8 pl-8 text-xs"
      />
    </div>
  )
}
