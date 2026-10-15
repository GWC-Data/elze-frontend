import { useDeferredValue, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Database,
  Plus,
  RefreshCw,
  Share2,
  Table2,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/hooks/usePaths'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/common/States'
import { Pagination } from '@/components/common/Pagination'
import { SearchBox, SearchToolbar } from '@/components/common/SearchBox'
import { serverPage } from '@/hooks/usePagination'
import { notify } from '@/lib/notify'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ContextQueryProvider } from '@/context/QueryProvider'
import { useDeleteConnection, useDraftConnections, useVerifyConnection } from '@/hooks/useMetadataLakehouse'
import { VersionBadge } from '@/components/common/metadata-lakehouse/VersionBadge'
import { McpDetailsDialog } from '@/components/common/metadata-lakehouse/McpDetailsDialog'
import { ContextShareDialog } from '@/components/common/metadata-lakehouse/ContextShareDialog'
import { accessAtLeast, CONTEXT_ACCESS_LABELS } from '@/lib/contextAccess'
import {
  PublishedContextsSection,
  type ShareTarget,
} from '@/components/common/metadata-lakehouse/PublishedContextsSection'
import { connectorPresentation } from '@/lib/connectors'
import { formatRelativeTime, maskSecretHint } from '@/lib/format'
import type { DraftConnection, McpTarget } from '@/types/metadataLakehouse'

type LakehouseView = 'drafts' | 'published'

const DRAFTS_PAGE_SIZE = 10

export default function MetadataLakehousePage({ view = 'drafts' }: { view?: LakehouseView }) {
  return (
    <ContextQueryProvider>
      {view === 'drafts' ? <DraftsView /> : <PublishedView />}
    </ContextQueryProvider>
  )
}

function ShareDialogFor({ target, onClose }: { target: ShareTarget | null; onClose: () => void }) {
  return (
    <ContextShareDialog
      connectionId={target?.id ?? null}
      name={target?.name ?? ''}
      open={target !== null}
      onOpenChange={(open) => !open && onClose()}
    />
  )
}

function DraftsView() {
  const { can } = useAuth()
  const paths = usePaths()
  const navigate = useNavigate()
  const canCreate = can('context.create')

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageFor, setPageFor] = useState(search)
  if (search !== pageFor) {
    setPageFor(search)
    setPage(1)
  }
  const query = useDeferredValue(search).trim()
  const drafts = useDraftConnections({ page, pageSize: DRAFTS_PAGE_SIZE, ...(query ? { search: query } : {}) })
  const verify = useVerifyConnection()
  const remove = useDeleteConnection()

  const [deleting, setDeleting] = useState<DraftConnection | null>(null)
  const [shareFor, setShareFor] = useState<ShareTarget | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const runVerify = async (connection: DraftConnection) => {
    setBusyId(connection.id)
    try {
      await verify.mutateAsync(connection.id)
      notify.success(`${connection.name} is still connected.`)
    } catch (err) {
      notify.failure(`verify ${connection.name}`, err)
    } finally {
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      notify.success(`${deleting.name} was removed.`, 'Its stored credential was deleted.')
      setDeleting(null)
    } catch (err) {
      notify.failure('remove that connection', err)
    }
  }

  const newConnection = (
    <Button onClick={() => navigate(paths.metadataLakehouseBuilder())} disabled={!canCreate}>
      <Plus className="size-4" aria-hidden />
      New connection
    </Button>
  )

  const data = drafts.data
  const items = data?.items ?? []

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'Metadata Lakehouse' }, { label: 'Drafts' }]}
        title="Drafts"
        description="Contexts being built from your data sources. Nothing here is served until it is published."
        actions={canCreate ? newConnection : undefined}
      />

      <SearchToolbar
        className="mt-5"
        search={
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search drafts…"
            label="Search drafts by connection or context name"
          />
        }
      />

      {drafts.isError ? (
        <Section>
          <ErrorState error={drafts.error} title="Unable to load your drafts" onRetry={() => drafts.refetch()} />
        </Section>
      ) : !data ? (
        <CardGridSkeleton count={3} />
      ) : data.total === 0 && !query ? (
        <Section>
          <EmptyState
            title="No drafts in progress"
            body={
              canCreate
                ? 'Start a new connection to build a context, or open a context in Published and choose Create new version.'
                : 'Nothing is being built right now. Your role can see contexts but not create them.'
            }
            icon={Database}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {canCreate ? newConnection : null}
                <Button asChild variant="outline">
                  <Link to={paths.metadataLakehousePublished}>Open Published</Link>
                </Button>
              </div>
            }
          />
        </Section>
      ) : (
        <Section>
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
              No draft matches “{search}”.
            </p>
          ) : (
            <div className="space-y-3">
              <div className={cn('grid gap-3 lg:grid-cols-2', drafts.isFetching && 'opacity-70')}>
                {items.map((connection) => (
                  <ConnectionCard
                    key={connection.id}
                    connection={connection}
                    busy={busyId === connection.id}
                    builderPath={paths.metadataLakehouseBuilder(connection.id)}
                    datasetsPath={paths.metadataLakehouseConnection(connection.id)}
                    onVerify={() => void runVerify(connection)}
                    onDelete={() => setDeleting(connection)}
                    onShare={() => setShareFor({ id: connection.id, name: connection.name })}
                  />
                ))}
              </div>
              <Pagination {...serverPage(page, DRAFTS_PAGE_SIZE, data.total)} setPage={setPage} noun="drafts" />
            </div>
          )}
        </Section>
      )}

      <ShareDialogFor target={shareFor} onClose={() => setShareFor(null)} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting ? `Remove ${deleting.name}?` : ''}
        body="The connection and its stored token are deleted."
        consequence="The dataset selection goes with it. Nothing in the warehouse is touched, but reconnecting means entering a token again."
        confirmLabel="Remove connection"
        destructive
        pending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </Page>
  )
}

function PublishedView() {
  const paths = usePaths()
  const [search, setSearch] = useState('')
  const [mcpFor, setMcpFor] = useState<McpTarget | null>(null)
  const [shareFor, setShareFor] = useState<ShareTarget | null>(null)

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'Metadata Lakehouse' }, { label: 'Published' }]}
        title="Published"
        description="Every published context you can open, with its full version history. Nothing here changes until a new version is published."
      />

      <SearchToolbar
        className="mt-5"
        search={
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search published contexts…"
            label="Search published contexts by name or connection"
          />
        }
      />

      <Section>
        <PublishedContextsSection
          builderPath={(id) => paths.metadataLakehouseBuilder(id)}
          datasetsPath={(id) => paths.metadataLakehouseConnection(id)}
          publishedPath={(id, versionId) => paths.metadataLakehouseBuilder(id, versionId)}
          onMcp={setMcpFor}
          onShare={setShareFor}
          search={search}
        />
      </Section>

      <McpDetailsDialog connection={mcpFor} onOpenChange={(open) => !open && setMcpFor(null)} />
      <ShareDialogFor target={shareFor} onClose={() => setShareFor(null)} />
    </Page>
  )
}

function ConnectionCard({
  connection,
  busy,
  builderPath,
  datasetsPath,
  onVerify,
  onDelete,
  onShare,
}: {
  connection: DraftConnection
  busy: boolean
  builderPath: string
  datasetsPath: string
  onVerify: () => void
  onDelete: () => void
  onShare: () => void
}) {
  const access = connection.access
  const canManage = accessAtLeast(access, 'edit')
  const canDelete = accessAtLeast(access, 'full')
  const presentation = connectorPresentation(connection.provider)
  const connected = connection.status === 'connected'
  const datasetCount = connection.selectedDatasetCount ?? 0
  const draft = connection.draft

  return (
    <article className="flex flex-col rounded-xl border bg-card">
      <div className="flex items-start gap-3 p-4">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-md',
            presentation.accentClass
          )}
        >
          <presentation.icon className="size-4" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={canManage ? builderPath : datasetsPath}
              className="truncate text-sm font-medium hover:text-primary"
            >
              {connection.name}
            </Link>
            <Badge
              variant="outline"
              className={
                connected
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
              }
            >
              {connected ? 'Connected' : 'Not working'}
            </Badge>
            {access && !access.isOwner && access.level !== 'full' ? (
              <Badge variant="outline" className="text-muted-foreground">
                {CONTEXT_ACCESS_LABELS[access.level]}
              </Badge>
            ) : null}
          </div>

          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {connection.host} · {maskSecretHint(connection.secretHint)}
            {access?.owner && !access.isOwner ? ` · owner ${access.owner.name ?? 'unknown'}` : ''}
          </p>

          {draft ? (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <VersionBadge status="draft" label={draft.label} />
              <span className="truncate">
                {draft.name} · edited {formatRelativeTime(draft.updatedAt)}
              </span>
            </p>
          ) : null}

          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Table2 className="size-3" aria-hidden />
              <dt className="sr-only">Datasets selected</dt>
              <dd>
                {datasetCount > 0
                  ? `${datasetCount} dataset${datasetCount === 1 ? '' : 's'} selected`
                  : 'No datasets selected'}
              </dd>
            </div>
            <div>
              <dt className="sr-only">Last verified</dt>
              <dd>Verified {formatRelativeTime(connection.lastVerifiedAt)}</dd>
            </div>
          </dl>

          {!connected && connection.lastError ? (
            <p className="mt-1.5 text-xs text-destructive">{connection.lastError}</p>
          ) : null}
        </div>
      </div>

      <footer className="mt-auto flex flex-wrap items-center gap-2 border-t px-4 py-2.5">
        {canManage ? (
          <Button asChild size="sm">
            <Link to={builderPath}>
              {datasetCount > 0 ? 'Continue building' : 'Build context'}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        ) : null}

        <Button asChild size="sm" variant={canManage ? 'outline' : 'default'}>
          <Link to={datasetsPath}>Datasets</Link>
        </Button>

        {canManage ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={onVerify}>
            <RefreshCw className={cn('size-4', busy && 'animate-spin')} aria-hidden />
            {busy ? 'Checking…' : 'Verify'}
          </Button>
        ) : null}
        {access?.canShare ? (
          <Button size="sm" variant="outline" onClick={onShare}>
            <Share2 className="size-4" aria-hidden />
            Share
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-destructive hover:text-destructive"
            aria-label={`Remove ${connection.name}`}
            onClick={onDelete}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        ) : null}
      </footer>
    </article>
  )
}
