import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Clock, Columns3, HardDrive, Layers, Loader2, Search, Sparkles, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/notify'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StepFrame } from '@/components/common/metadata-lakehouse/StepFrame'
import {
  EmptyState,
  EndpointPendingState,
  ErrorState,
  NoConnectionState,
  QueryBoundary,
  RefreshingBar,
  TableSkeleton,
  TileSkeleton,
} from '@/components/common/metadata-lakehouse/DataStates'
import { Skeleton } from '@/components/ui/skeleton'
import { Cell, StatTile } from '@/components/common/metadata-lakehouse/primitives'
import { Pagination } from '@/components/common/Pagination'
import { usePagination } from '@/hooks/usePagination'
import {
  formatBytes,
  formatCount,
  formatExact,
  formatPercent,
  formatRelativeTime,
} from '@/lib/format'
import { isEndpointMissing } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import {
  useConnection,
  useProfileOverview,
  useExtraction, useRunExtraction,
  useTableProfile,
} from '@/hooks/useMetadataLakehouse'
import { useWorkflow } from '@/context/workflowContext'
import type { ColumnProfile, ProfileTableRef, SampleRecords } from '@/types/metadataLakehouse'
import { Hint } from '@/components/common/Hint'

export function ProfileStep() {
  const { connectionId, activeTableId, setActiveTableId, goToStep, next, readOnly } = useWorkflow()
  const overview = useProfileOverview(connectionId)
  const connection = useConnection(connectionId)
  const runExtraction = useRunExtraction(connectionId)
  const saved = useExtraction(connectionId, !readOnly)

  const datasetIds = useMemo(
    () => (connection.data?.selectedDatasets ?? []).map((d) => d.id),
    [connection.data]
  )

  const reusable = useMemo(() => {
    const run = saved.data
    if (!run) return false
    if (!run.datasetIds) return true
    const a = [...run.datasetIds].sort()
    const b = [...datasetIds].sort()
    return a.length === b.length && a.every((id, i) => id === b[i])
  }, [saved.data, datasetIds])

  const rerun = async () => {
    try {
      await runExtraction.mutateAsync({ datasetIds })
      next()
    } catch (err) {
      notify.failure('run the context extraction', err)
    }
  }

  const firstTableId = useMemo(
    () => overview.data?.datasets.flatMap((d) => d.tables)[0]?.id ?? null,
    [overview.data]
  )
  useEffect(() => {
    if (!activeTableId && firstTableId) setActiveTableId(firstTableId)
  }, [activeTableId, firstTableId, setActiveTableId])

  if (!connectionId) {
    return (
      <StepFrame title="Profile tables and schema" hideNext>
        <NoConnectionState onConnect={() => goToStep('connect')} />
      </StepFrame>
    )
  }

  return (
    <StepFrame
      title="Profile tables and schema"
      description="Structure and statistics for the datasets you selected, read from the source by the backend."
      nextLabel={reusable ? 'Next' : 'Analyse with AI'}
      nextPending={runExtraction.isPending}
      actions={
        reusable && !readOnly ? (
          <Button variant="outline" size="sm" onClick={rerun} disabled={runExtraction.isPending}>
            {runExtraction.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
            Re-run AI analysis
          </Button>
        ) : undefined
      }
      pendingLabel="Analysing…"
      pendingOverlay={{
        title: 'Analysing your data with AI',
        detail: `Reading ${datasetIds.length} dataset${datasetIds.length === 1 ? '' : 's'} and generating the business glossary, metrics and relationships. This can take a few minutes — keep this tab open.`,
      }}
      refreshing={overview.isFetching && !overview.isPending}
      nextDisabled={datasetIds.length === 0}
      onNext={async () => {
        if (reusable) return true
        try {
          await runExtraction.mutateAsync({ datasetIds })
          return true
        } catch (err) {
          notify.failure('run the context extraction', err)
          return false
        }
      }}
      footerNote={
        reusable && saved.data?.extractedAt
          ? `AI analysis saved ${formatRelativeTime(saved.data.extractedAt)} · Next opens it without re-running`
          : overview.data?.profiledAt
          ? `Selected ${formatRelativeTime(overview.data.profiledAt)} · table details are read live`
          : undefined
      }
    >
      <QueryBoundary
        query={overview}
        step="Profile"
        endpoint={`GET ${endpoints.context.profileOverview(connectionId)}`}
        context="load the profile"
        loading={<TableSkeleton rows={6} columns={4} />}
        isEmpty={(d) => d.datasets.length === 0}
        empty={
          <EmptyState
            title="No profiled datasets"
            detail="The datasets you selected have not been profiled yet."
          />
        }
      >
        {(data) => (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <TableNav
              tables={data.datasets.flatMap((d) => d.tables)}
              activeTableId={activeTableId}
              onSelect={setActiveTableId}
            />

            <section className="min-w-0">
              {activeTableId ? (
                <TableDetail key={activeTableId} connectionId={connectionId} tableId={activeTableId} />
              ) : (
                <EmptyState title="Select a table" detail="Choose a table to see its profile." />
              )}
            </section>
          </div>
        )}
      </QueryBoundary>
    </StepFrame>
  )
}

function TableNav({
  tables,
  activeTableId,
  onSelect,
}: {
  tables: ProfileTableRef[]
  activeTableId: string | null
  onSelect: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const visible = query ? tables.filter((t) => t.name.toLowerCase().includes(query)) : tables

  return (
    <aside className="lg:sticky lg:top-0 lg:self-start overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Tables</h3>
          <span className="text-[11px] font-semibold tabular-nums text-primary">
            {tables.length}
          </span>
        </div>
        {tables.length > 5 ? (
          <div className="relative mt-2.5">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter tables…"
              aria-label="Filter tables"
              className="h-8 pl-8 text-xs"
            />
          </div>
        ) : null}
      </div>

      <nav className="max-h-[calc(100vh-300px)] overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {visible.map((table) => {
            const active = table.id === activeTableId
            return (
              <li key={table.id}>
                <Hint label={table.name}><button
                  type="button"
                  onClick={() => onSelect(table.id)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    active
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {active ? (
                    <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" aria-hidden />
                  ) : null}
                  <Table2
                    className={cn('size-3.5 shrink-0', active ? 'text-primary' : 'opacity-60')}
                    aria-hidden
                  />
                  <span className="truncate">{table.name}</span>
                </button></Hint>
              </li>
            )
          })}
        </ul>
        {tables.length === 0 ? (
          <p className="px-3 py-2 text-xs italic text-muted-foreground">No tables reported</p>
        ) : visible.length === 0 ? (
          <p className="px-3 py-2 text-xs italic text-muted-foreground">No tables match “{search}”</p>
        ) : null}
      </nav>
    </aside>
  )
}

function TableDetail({ connectionId, tableId }: { connectionId: string; tableId: string }) {
  const profile = useTableProfile(connectionId, tableId)

  if (profile.isError) {
    return isEndpointMissing(profile.error) ? (
      <EndpointPendingState
        step="Table profile"
        endpoint={`GET ${endpoints.context.tableProfile(connectionId, tableId)}`}
      />
    ) : (
      <ErrorState
        context="load this table's profile"
        error={profile.error}
        onRetry={() => profile.refetch()}
      />
    )
  }
  if (profile.isPending || !profile.data) return <TableDetailSkeleton />

  const table = profile.data

  return (
    <div className="relative space-y-6">
      <RefreshingBar active={profile.isFetching} />
      <header className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Table2 className="size-4" aria-hidden />
          </span>
          <div>
            <h3 className="text-base font-semibold text-foreground tracking-tight">{table.name}</h3>
            {table.description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{table.description}</p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          icon={<Layers className="size-3.5 text-primary" />}
          label="Rows"
          value={formatCount(table.rowCount)}
        />
        <StatTile
          icon={<Columns3 className="size-3.5 text-primary" />}
          label="Columns"
          value={formatExact(table.columnCount)}
        />
        <StatTile
          icon={<HardDrive className="size-3.5 text-primary" />}
          label="Storage"
          value={formatBytes(table.sizeBytes)}
        />
        <StatTile
          icon={<Clock className="size-3.5 text-primary" />}
          label="Last refreshed"
          value={
            <span className="text-sm font-medium">
              {formatRelativeTime(table.lastRefreshedAt)}
            </span>
          }
        />
      </div>

      <Tabs defaultValue="schema" className="w-full">
        <TabsList className="bg-muted/60 p-1 border border-border/50">
          <TabsTrigger value="schema" className="gap-1.5 text-xs font-medium">
            Schema &amp; statistics
            <TabCount value={table.columns.length} />
          </TabsTrigger>
          <TabsTrigger value="sample" className="gap-1.5 text-xs font-medium">
            Sample records
            {table.sample ? <TabCount value={table.sample.rows.length} /> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schema" className="mt-4 focus-visible:outline-none">
          <SchemaTable columns={table.columns} />
          {table.statsSampleSize !== null && table.statsSampleSize > 0 ? (
            <p className="mt-2.5 text-xs text-muted-foreground">
              Null % and unique counts are computed from a sample of{' '}
              <strong className="font-semibold text-foreground">{formatExact(table.statsSampleSize)}</strong> rows
              {table.rowCount !== null && table.rowCount > table.statsSampleSize
                ? ` out of ${formatCount(table.rowCount)}`
                : ''}
              . Column names and types are exact.
            </p>
          ) : null}
        </TabsContent>

        <TabsContent value="sample" className="mt-4 focus-visible:outline-none">
          <SampleTable sample={table.sample} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TableDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading table profile…</span>
      <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
        <Skeleton className="size-9 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
      <TileSkeleton count={4} className="grid-cols-2 sm:grid-cols-4" />
      <Skeleton className="h-9 w-64 rounded-lg" />
      <div className="rounded-xl border bg-card p-4 shadow-xs">
        <TableSkeleton rows={8} columns={5} />
      </div>
    </div>
  )
}

function TabCount({ value }: { value: number }) {
  return (
    <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
      {formatExact(value)}
    </span>
  )
}

function typeTone(dataType: string): string {
  const t = dataType.toLowerCase()
  if (/int|long|decimal|double|float|number|numeric|real/.test(t))
    return 'text-sky-700 dark:text-sky-300'
  if (/date|time/.test(t)) return 'text-violet-700 dark:text-violet-300'
  if (/bool/.test(t)) return 'text-amber-700 dark:text-amber-300'
  return 'text-emerald-700 dark:text-emerald-300'
}

function NullRate({ value }: { value: number | null }) {
  if (value === null) return <Cell value={null} />
  const tone = value >= 50 ? 'bg-red-500' : value >= 10 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="font-medium tabular-nums text-foreground">{formatPercent(value)}</span>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span
          className={cn('block h-full rounded-full', tone)}
          style={{ width: `${Math.min(100, Math.max(value > 0 ? 3 : 0, value))}%` }}
        />
      </span>
    </div>
  )
}

function SchemaTable({ columns }: { columns: ColumnProfile[] }) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const filtered = query
    ? columns.filter(
        (c) => c.name.toLowerCase().includes(query) || c.dataType.toLowerCase().includes(query)
      )
    : columns
  const paging = usePagination(filtered)

  if (columns.length === 0) {
    return <EmptyState title="No columns reported" />
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <p className="text-xs text-muted-foreground">
          <strong className="font-semibold text-foreground">{formatExact(columns.length)}</strong> columns
        </p>
        <div className="relative w-full sm:w-56">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              paging.setPage(1)
            }}
            placeholder="Filter columns or types…"
            aria-label="Filter columns"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" className="w-12 px-4 py-3 text-right font-medium">
                #
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium">
                Column
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium">
                Type
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Null %
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Unique
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paging.pageItems.map((column, i) => (
              <tr key={column.name} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">
                  {paging.startIndex + i + 1}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{column.name}</span>
                    {column.isPrimaryKey ? (
                      <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                        PK
                      </span>
                    ) : null}
                    {column.isForeignKey ? (
                      <span className="rounded border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                        FK
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-block font-mono text-[11px] font-semibold uppercase',
                      typeTone(column.dataType)
                    )}
                  >
                    {column.dataType}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <NullRate value={column.nullPercent} />
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">
                  <Cell value={formatCount(column.uniqueCount)} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-xs italic text-muted-foreground">
                  No columns match “{search}”
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Pagination {...paging} noun="columns" />
    </div>
  )
}

function SampleTable({ sample }: { sample: SampleRecords | null }) {
  const paging = usePagination(sample?.rows ?? [])

  if (!sample || sample.rows.length === 0) {
    return (
      <EmptyState
        title="No sample available"
        detail="The backend did not return sample records for this table."
      />
    )
  }

  return (
    <div className="space-y-2.5">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="sticky left-0 z-10 w-12 border-r border-border bg-muted px-3 py-3 text-right font-medium"
                >
                  #
                </th>
                {sample.columns.map((column) => (
                  <th key={column} scope="col" className="whitespace-nowrap px-4 py-3 text-left font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-xs">
              {paging.pageItems.map((row, i) => (
                <tr key={paging.startIndex + i} className="group transition-colors hover:bg-muted/30">
                  <td className="sticky left-0 z-10 border-r border-border bg-card px-3 py-2.5 text-right tabular-nums text-muted-foreground group-hover:bg-muted">
                    {paging.startIndex + i + 1}
                  </td>
                  {row.map((value, j) => (
                    <td key={j} className="max-w-[260px] whitespace-nowrap px-4 py-2.5">
                      {value === null ? (
                        <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] italic text-muted-foreground">
                          null
                        </span>
                      ) : (
                        <Hint label={String(value)}><span className="block truncate text-foreground">
                          {String(value)}
                        </span></Hint>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination {...paging} noun="records" />
      </div>
      {sample.sampledFrom !== null ? (
        <p className="text-xs text-muted-foreground">
          {formatExact(sample.rows.length)} rows sampled from{' '}
          <strong className="font-medium text-foreground">{formatCount(sample.sampledFrom)}</strong>.
        </p>
      ) : null}
    </div>
  )
}
