import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Database,
  Plus,
  RefreshCw,
  Table2,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/hooks/usePaths'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/common/States'
import { notify } from '@/lib/notify'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ContextQueryProvider } from '@/context/QueryProvider'
import { useConnections, useDeleteConnection, useVerifyConnection } from '@/hooks/useMetadataLakehouse'
import { VersionBadge } from '@/components/common/metadata-lakehouse/VersionBadge'
import { McpDetailsDialog } from '@/components/common/metadata-lakehouse/McpDetailsDialog'
import { PublishedContextsSection, PublishedSearch } from '@/components/common/metadata-lakehouse/PublishedContextsSection'
import { connectorPresentation } from '@/lib/connectors'
import { formatRelativeTime, maskSecretHint } from '@/lib/format'
import type { Connection } from '@/types/metadataLakehouse'

export default function MetadataLakehousePage() {
  return (
    <ContextQueryProvider>
      <ConnectionsLanding />
    </ContextQueryProvider>
  )
}

function ConnectionsLanding() {
  const { can } = useAuth()
  const paths = usePaths()
  const navigate = useNavigate()
  // context.manage was split: starting a connection, working on a draft and deleting are
  // separate permissions (backend constants/permissions.ts).
  const canCreate = can('context.create')
  const canManage = can('context.update')
  const canDelete = can('context.delete')

  const connections = useConnections()
  const verify = useVerifyConnection()
  const remove = useDeleteConnection()

  const [deleting, setDeleting] = useState<Connection | null>(null)
  const [mcpFor, setMcpFor] = useState<Connection | null>(null)
  const [publishedSearch, setPublishedSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const runVerify = async (connection: Connection) => {
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

  const list = connections.data ?? []
  const drafts = list.filter((c) => !c.published || c.context?.status === 'draft')

  return (
    <Page>
      <PageHeader
        title="Metadata Lakehouse"
        description="The data sources connected to this company, and the context built from them."
        actions={canCreate ? newConnection : undefined}
      />

      {connections.isError ? (
        <Section>
          <ErrorState
            error={connections.error}
            title="Unable to load your connections"
            onRetry={() => connections.refetch()}
          />
        </Section>
      ) : connections.isPending ? (
        <CardGridSkeleton count={3} />
      ) : list.length === 0 ? (
        <Section>
          <EmptyState
            title="No data source connected yet"
            body={
              canCreate
                ? 'Start a new connection to choose a warehouse, pick its datasets, and build a context from them. The credential is validated against the warehouse before anything is saved.'
                : 'Nobody has connected a warehouse for this company yet. Your role can see connections but not create them.'
            }
            icon={Database}
            action={canCreate ? newConnection : undefined}
          />
        </Section>
      ) : (
        <>
          <Section
            title="Drafts"
            description="Contexts being built. Nothing here is served until it is published."
          >
            {drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No drafts in progress. Edit a published context below to start its next version.
              </p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {drafts.map((connection) => (
                  <ConnectionCard
                    key={connection.id}
                    connection={connection}
                    canManage={canManage}
                    canDelete={canDelete}
                    busy={busyId === connection.id}
                    builderPath={paths.metadataLakehouseBuilder(connection.id)}
                    datasetsPath={paths.metadataLakehouseConnection(connection.id)}
                    onVerify={() => void runVerify(connection)}
                    onDelete={() => setDeleting(connection)}
                  />
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Published"
            description="Every published context and its full version history. Open a card or a version to see it as published; the menu has its MCP details and Create new version."
            actions={<PublishedSearch value={publishedSearch} onChange={setPublishedSearch} />}
          >
            <PublishedContextsSection
              connections={list}
              canManage={canManage}
              builderPath={(id) => paths.metadataLakehouseBuilder(id)}
              datasetsPath={(id) => paths.metadataLakehouseConnection(id)}
              publishedPath={(id, versionId) => paths.metadataLakehouseBuilder(id, versionId)}
              onMcp={setMcpFor}
              search={publishedSearch}
            />
          </Section>
        </>
      )}

      <McpDetailsDialog connection={mcpFor} onOpenChange={(open) => !open && setMcpFor(null)} />

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

function ConnectionCard({
  connection,
  canManage,
  canDelete,
  busy,
  builderPath,
  datasetsPath,
  onVerify,
  onDelete,
}: {
  connection: Connection
  canManage: boolean
  canDelete: boolean
  busy: boolean
  builderPath: string
  datasetsPath: string
  onVerify: () => void
  onDelete: () => void
}) {
  const presentation = connectorPresentation(connection.provider)
  const connected = connection.status === 'connected'
  const datasetCount = connection.selectedDatasetCount ?? 0

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
          </div>

          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {connection.host} · {maskSecretHint(connection.secretHint)}
          </p>

          {connection.context ? (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <VersionBadge status={connection.context.status} label={connection.context.label} />
              <span className="truncate">
                {connection.context.name}
                {connection.context.status === 'published' && connection.context.publishedAt
                  ? ` · published ${formatRelativeTime(connection.context.publishedAt)}`
                  : ` · edited ${formatRelativeTime(connection.context.updatedAt)}`}
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
              {connection.context?.status === 'published'
                ? 'Create new version'
                : datasetCount > 0
                  ? 'Continue building'
                  : 'Build context'}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        ) : null}

        <Button asChild size="sm" variant={canManage ? 'outline' : 'default'}>
          <Link to={datasetsPath}>Datasets</Link>
        </Button>

        {canManage ? (
          <>
            <Button size="sm" variant="outline" disabled={busy} onClick={onVerify}>
              <RefreshCw className={cn('size-4', busy && 'animate-spin')} aria-hidden />
              {busy ? 'Checking…' : 'Verify'}
            </Button>
          </>
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
