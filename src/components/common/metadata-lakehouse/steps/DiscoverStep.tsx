import { useDeferredValue, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Info,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { StepFrame } from '@/components/common/metadata-lakehouse/StepFrame'
import { EmptyState, QueryBoundary, TableSkeleton } from '@/components/common/metadata-lakehouse/DataStates'
import { Cell } from '@/components/common/metadata-lakehouse/primitives'
import {
  EMPTY,
  formatBytes,
  formatCount,
  formatExact,
  formatPercent,
  formatRelativeTime,
  formatText,
} from '@/lib/format'
import { endpoints } from '@/api/endpoints'
import { DATASET_LIMIT_OPTIONS, DEFAULT_DATASET_LIMIT } from '@/constants/metadataLakehouse'
import { useConnection, useDatasets, useSaveSelection } from '@/hooks/useMetadataLakehouse'
import { useWorkflow } from '@/context/workflowContext'
import { NoConnectionState } from '@/components/common/metadata-lakehouse/DataStates'
import type { WarehouseDataset } from '@/types/metadataLakehouse'
import { Hint } from '@/components/common/Hint'

interface ColumnDef {
  id: string
  header: string
  align?: 'right'
  present: (rows: WarehouseDataset[]) => boolean
  render: (row: WarehouseDataset) => React.ReactNode
  search?: (row: WarehouseDataset) => string
}

const has = <K extends keyof WarehouseDataset>(key: K) => (rows: WarehouseDataset[]) =>
  rows.some((r) => r[key] !== undefined && r[key] !== null)

const COLUMNS: ColumnDef[] = [
  {
    id: 'name',
    header: 'Dataset',
    present: () => true,
    search: (r) => `${r.name} ${r.description ?? ''}`,
    render: (r) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{r.name}</p>
        {r.description ? (
          <p className="truncate text-xs text-muted-foreground">{r.description}</p>
        ) : null}
      </div>
    ),
  },
  {
    id: 'type',
    header: 'Type',
    present: has('type'),
    render: (r) => <Cell value={formatText(r.type)} />,
  },
  {
    id: 'schema',
    header: 'Schema',
    present: has('schema'),
    search: (r) => r.schema ?? '',
    render: (r) => <Cell value={formatText(r.schema)} />,
  },
  {
    id: 'tables',
    header: 'Tables',
    align: 'right',
    present: has('tableCount'),
    render: (r) => <Cell value={formatExact(r.tableCount)} />,
  },
  {
    id: 'columns',
    header: 'Columns',
    align: 'right',
    present: has('columnCount'),
    render: (r) => <Cell value={formatExact(r.columnCount)} />,
  },
  {
    id: 'rows',
    header: 'Rows',
    align: 'right',
    present: has('rowCount'),
    render: (r) => <Cell value={formatCount(r.rowCount)} />,
  },
  {
    id: 'size',
    header: 'Size',
    align: 'right',
    present: has('sizeBytes'),
    render: (r) => <Cell value={formatBytes(r.sizeBytes)} />,
  },
  {
    id: 'owner',
    header: 'Owner',
    present: has('owner'),
    search: (r) => r.owner ?? '',
    render: (r) => <Cell value={formatText(r.owner)} />,
  },
  {
    id: 'quality',
    header: 'Quality',
    align: 'right',
    present: has('qualityScore'),
    render: (r) => <Cell value={formatPercent(r.qualityScore)} />,
  },
  {
    id: 'metadata',
    header: 'Metadata',
    present: has('metadataStatus'),
    render: (r) => <Cell value={formatText(r.metadataStatus)} />,
  },
  {
    id: 'updated',
    header: 'Last updated',
    align: 'right',
    present: has('lastUpdated'),
    render: (r) => <Cell value={formatRelativeTime(r.lastUpdated)} />,
  },
]

export function DiscoverStep() {
  const { connectionId, selectedDatasetIds, setSelectedDatasetIds, goToStep, readOnly } = useWorkflow()

  const [limit, setLimit] = useState<number>(DEFAULT_DATASET_LIMIT)

  const datasets = useDatasets(connectionId, limit)
  const connection = useConnection(connectionId)
  const saveSelection = useSaveSelection(connectionId)

  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)

  const saved = useMemo(
    () => connection.data?.selectedDatasets ?? [],
    [connection.data]
  )
  const savedIds = useMemo(() => saved.map((d) => d.id), [saved])
  const selection = selectedDatasetIds ?? savedIds

  const rows = useMemo<WarehouseDataset[]>(() => {
    const listed = datasets.data?.datasets ?? []
    const listedIds = new Set(listed.map((d) => d.id))
    const offPage: WarehouseDataset[] = saved
      .filter((d) => !listedIds.has(d.id))
      .map((d) => ({
        id: d.id,
        name: d.name || d.id,
        description: null,
        rowCount: d.rowCount,
        columnCount: d.columnCount,
        owner: null,
        lastUpdated: null,
      }))
    return [...offPage, ...listed]
  }, [datasets.data, saved])

  const toggleDataset = (id: string) =>
    setSelectedDatasetIds(
      selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id]
    )

  if (!connectionId) {
    return (
      <StepFrame title="Discover datasets" hideNext>
        <NoConnectionState onConnect={() => goToStep('connect')} />
      </StepFrame>
    )
  }

  return (
    <StepFrame
      title="Discover datasets"
      description={
        readOnly
          ? 'The datasets this context was built from.'
          : 'Choose the datasets to build context from.'
      }
      actions={
        readOnly ? undefined : <>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Show
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              disabled={datasets.isFetching}
              aria-label="How many datasets to fetch"
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs text-foreground outline-none focus-visible:border-ring disabled:opacity-50"
            >
              {DATASET_LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <Button
            variant="outline"
            size="sm"
            onClick={() => datasets.refetch()}
            disabled={datasets.isFetching}
          >
            <RefreshCw
              className={cn('size-4', datasets.isFetching && 'animate-spin')}
              aria-hidden
            />
            Refresh
          </Button>
        </>
      }
      nextDisabled={selection.length === 0}
      nextPending={saveSelection.isPending}
      pendingLabel="Saving selection…"
      pendingOverlay={{
        title: 'Saving your selection',
        detail: `Recording ${selection.length} dataset${selection.length === 1 ? '' : 's'} for this context.`,
      }}
      refreshing={datasets.isFetching && !datasets.isPending}
      footerNote={
        selection.length > 0
          ? `${selection.length} dataset${selection.length === 1 ? '' : 's'} selected`
          : 'Select at least one dataset to continue.'
      }
      onNext={async () => {
        const chosen = rows.filter((d) => selection.includes(d.id))
        try {
          await saveSelection.mutateAsync(
            chosen.map((d) => ({
              id: d.id,
              name: d.name,
              rowCount: d.rowCount,
              columnCount: d.columnCount,
            }))
          )
          return true
        } catch (err) {
          notify.failure('save your dataset selection', err)
          return false
        }
      }}
    >
      <QueryBoundary
        query={datasets}
        step="Discover"
        endpoint={`GET ${endpoints.context.datasets(connectionId)}`}
        context="load datasets from your connection"
        loading={<TableSkeleton rows={8} columns={6} />}
        isEmpty={(d) => d.datasets.length === 0}
        empty={
          <EmptyState
            title="This connection reports no datasets"
            detail="The credential is valid but the account can see nothing. Check its permissions in the source, then refresh."
            action={
              <Button variant="outline" size="sm" onClick={() => datasets.refetch()}>
                <RefreshCw className="size-4" aria-hidden />
                Refresh
              </Button>
            }
          />
        }
      >
        {(data) => (
          <DatasetTable
            rows={rows}
            configuredIds={savedIds}
            listedCount={data.datasets.length}
            fetchedAt={data.fetchedAt}
            truncated={data.truncated}
            limit={data.limit}
            onWiden={() => {
              const next = DATASET_LIMIT_OPTIONS.find((option) => option > data.limit)
              if (next) setLimit(next)
            }}
            search={deferredSearch}
            onSearch={setSearch}
            searchValue={search}
            selectedIds={selection}
            onToggle={toggleDataset}
            onSetAll={setSelectedDatasetIds}
            readOnly={readOnly}
          />
        )}
      </QueryBoundary>
    </StepFrame>
  )
}

function DatasetTable({
  rows,
  configuredIds,
  listedCount,
  fetchedAt,
  truncated,
  limit,
  onWiden,
  search,
  searchValue,
  onSearch,
  selectedIds,
  onToggle: toggle,
  onSetAll: setAll,
  readOnly = false,
}: {
  rows: WarehouseDataset[]
  configuredIds: string[]
  listedCount: number
  fetchedAt: string
  truncated: boolean
  limit: number
  onWiden: () => void
  search: string
  searchValue: string
  onSearch: (value: string) => void
  selectedIds: string[]
  onToggle: (id: string) => void
  onSetAll: (ids: string[]) => void
  readOnly?: boolean
}) {
  const onToggle = readOnly ? () => {} : toggle
  const onSetAll = readOnly ? () => {} : setAll
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [pageFor, setPageFor] = useState(search)
  if (search !== pageFor) {
    setPageFor(search)
    setPage(1)
  }

  const configured = useMemo(() => new Set(configuredIds), [configuredIds])
  const offPageCount = rows.length - listedCount

  const dirty = useMemo(() => {
    if (selectedIds.length !== configuredIds.length) return true
    const current = new Set(selectedIds)
    return configuredIds.some((id) => !current.has(id))
  }, [selectedIds, configuredIds])

  const columns = useMemo(() => COLUMNS.filter((c) => c.present(rows)), [rows])

  const query = search.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!query) return rows
    const searchers = columns.filter((c) => c.search).map((c) => c.search!)
    return rows.filter(
      (row) =>
        row.id.toLowerCase().includes(query) ||
        searchers.some((read) => read(row).toLowerCase().includes(query))
    )
  }, [rows, query, columns])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, filtered.length)
  const paginatedRows = useMemo(
    () => filtered.slice(startIndex, endIndex),
    [filtered, startIndex, endIndex]
  )

  const selected = new Set(selectedIds)
  const currentPageIds = paginatedRows.map((r) => r.id)
  const allCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selected.has(id))

  const toggleAllCurrentPage = () => {
    if (allCurrentPageSelected) {
      onSetAll(selectedIds.filter((id) => !currentPageIds.includes(id)))
    } else {
      onSetAll([...new Set([...selectedIds, ...currentPageIds])])
    }
  }

  return (
    <div className="space-y-3">
      {configuredIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
          <CheckCircle2 className="size-3.5 shrink-0 text-primary" aria-hidden />
          <span className="text-foreground">
            <strong className="font-medium">
              {configuredIds.length} dataset{configuredIds.length === 1 ? '' : 's'}
            </strong>{' '}
            already configured for this connection
            {offPageCount > 0 ? (
              <>
                {' '}
                — {offPageCount} of them {offPageCount === 1 ? 'is' : 'are'} outside the
                current listing and {offPageCount === 1 ? 'is' : 'are'} shown first below,
                so {offPageCount === 1 ? 'it stays' : 'they stay'} selected when you save.
              </>
            ) : null}
            .
          </span>
          {dirty && !readOnly ? (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6"
              onClick={() => onSetAll(configuredIds)}
            >
              Reset to saved
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search datasets or paste an id…"
            className="pl-8"
            aria-label="Search datasets by name, id, schema or owner"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {selectedIds.length > 0 && !readOnly ? (
            <Button variant="ghost" size="sm" onClick={() => onSetAll([])}>
              Clear selection ({selectedIds.length})
            </Button>
          ) : null}
          <span>
            {filtered.length} of {rows.length}
            {truncated ? '+' : ''} · fetched {formatRelativeTime(fetchedAt)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr className="border-b">
              <th scope="col" className="w-10 px-3 py-2.5">
                <Checkbox
                  checked={allCurrentPageSelected}
                  onCheckedChange={toggleAllCurrentPage}
                  disabled={readOnly}
                  aria-label="Select all datasets on this page"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-3 py-2.5 font-medium',
                    col.align === 'right' ? 'text-right' : 'text-left'
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedRows.map((row) => {
              const isSelected = selected.has(row.id)
              return (
                <tr
                  key={row.id}
                  onClick={() => onToggle(row.id)}
                  className={cn(
                    !readOnly && 'cursor-pointer transition-colors hover:bg-accent/40',
                    isSelected && 'bg-primary/5'
                  )}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggle(row.id)}
                      disabled={readOnly}
                      aria-label={`Select ${row.name}`}
                    />
                  </td>
                  {columns.map((col, colIndex) => (
                    <td
                      key={col.id}
                      className={cn(
                        'px-3 py-2.5',
                        col.align === 'right' ? 'text-right' : 'text-left'
                      )}
                    >
                      {colIndex === 0 ? (
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            {col.render(row)}
                            {query && row.id.toLowerCase().includes(query) ? (
                              <p className="truncate font-mono text-[11px] text-muted-foreground">
                                {row.id}
                              </p>
                            ) : null}
                          </div>
                          {configured.has(row.id) ? (
                            <Badge
                              variant="outline"
                              className="mt-0.5 shrink-0 border-primary/30 bg-primary/10 text-[10px] text-primary"
                            >
                              Configured
                            </Badge>
                          ) : null}
                        </div>
                      ) : (
                        col.render(row)
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-muted-foreground">
            No dataset matches “{searchValue}”.
          </p>
        ) : null}
      </div>

      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <div className="flex items-center gap-1">
              {[10, 25, 50].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setPageSize(size)
                    setPage(1)
                  }}
                  className={cn(
                    'h-7 px-2.5 rounded-md font-medium transition-colors',
                    pageSize === size
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="font-semibold text-foreground">{startIndex + 1}</strong>–
              <strong className="font-semibold text-foreground">{endIndex}</strong> of{' '}
              <strong className="font-semibold text-foreground">{filtered.length}</strong>
              {truncated ? '+' : ''}
            </span>

            <div className="flex items-center gap-1">
              <Hint label="First page"><Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setPage(1)}
                disabled={currentPage <= 1}
                aria-label="Go to first page"
              >
                <ChevronsLeft className="size-3.5" aria-hidden />
              </Button></Hint>
              <Hint label="Previous page"><Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                aria-label="Go to previous page"
              >
                <ChevronLeft className="size-3.5" aria-hidden />
              </Button></Hint>
              <span className="px-2 font-medium text-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Hint label="Next page"><Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                aria-label="Go to next page"
              >
                <ChevronRight className="size-3.5" aria-hidden />
              </Button></Hint>
              <Hint label="Last page"><Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setPage(totalPages)}
                disabled={currentPage >= totalPages}
                aria-label="Go to last page"
              >
                <ChevronsRight className="size-3.5" aria-hidden />
              </Button></Hint>
            </div>
          </div>
        </div>
      )}

      {truncated && !readOnly ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs dark:border-amber-900 dark:bg-amber-950/40">
          <Info className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <span className="text-amber-800 dark:text-amber-200">
            Showing the first {limit}. This connection has more datasets than are listed here.
          </span>
          <Button variant="outline" size="sm" className="ml-auto h-7" onClick={onWiden}>
            Load more
          </Button>
        </div>
      ) : null}

      {columns.length < COLUMNS.length ? (
        <p className="text-xs text-muted-foreground">
          Columns are shown only when the connection reports them. Missing:{' '}
          {COLUMNS.filter((c) => !columns.includes(c))
            .map((c) => c.header)
            .join(', ')}
          . A value the source does not provide is shown as {EMPTY} rather than estimated.
        </p>
      ) : null}
    </div>
  )
}
