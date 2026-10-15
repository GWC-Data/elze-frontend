import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchBox, SearchToolbar } from '@/components/common/SearchBox'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { StepFrame } from '@/components/common/metadata-lakehouse/StepFrame'
import { EmptyState, QueryBoundary, TableSkeleton } from '@/components/common/metadata-lakehouse/DataStates'
import { Cell } from '@/components/common/metadata-lakehouse/primitives'
import {
  formatBytes,
  formatCount,
  formatExact,
  formatPercent,
  formatRelativeTime,
  formatText,
} from '@/lib/format'
import { endpoints } from '@/api/endpoints'
import { useConnection, useDatasets, useRefreshDatasets, useSaveSelection } from '@/hooks/useMetadataLakehouse'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
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

const PAGE_SIZES = [10, 25, 50] as const
const DEFAULT_PAGE_SIZE = 25

export function DiscoverStep() {
  const { connectionId, selectedDatasetIds, setSelectedDatasetIds, goToStep, readOnly } = useWorkflow()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const settledSearch = useDebouncedValue(search.trim(), 400)
  const [pageFor, setPageFor] = useState(settledSearch)
  if (settledSearch !== pageFor) {
    setPageFor(settledSearch)
    setPage(1)
  }

  const query = useMemo(() => ({ page, pageSize, search: settledSearch }), [page, pageSize, settledSearch])
  const datasets = useDatasets(connectionId, query)
  const refresh = useRefreshDatasets(connectionId)
  const connection = useConnection(connectionId)
  const saveSelection = useSaveSelection(connectionId)

  const saved = useMemo(() => connection.data?.selectedDatasets ?? [], [connection.data])
  const savedIds = useMemo(() => saved.map((d) => d.id), [saved])
  const selection = selectedDatasetIds ?? savedIds

  const seen = useRef(new Map<string, WarehouseDataset>())
  useEffect(() => {
    for (const dataset of datasets.data?.datasets ?? []) seen.current.set(dataset.id, dataset)
  }, [datasets.data])

  const toggleDataset = (id: string) =>
    setSelectedDatasetIds(
      selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id]
    )

  const busy = datasets.isFetching || refresh.isPending

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
          : 'Choose the datasets to build context from. Each page is fetched from the source when you open it.'
      }
      actions={
        readOnly ? undefined : (
          <Button variant="outline" size="sm" onClick={() => refresh.mutate(query)} disabled={busy}>
            <RefreshCw className={cn('size-4', busy && 'animate-spin')} aria-hidden />
            Refresh
          </Button>
        )
      }
      nextDisabled={selection.length === 0}
      nextPending={saveSelection.isPending}
      pendingLabel="Saving selection…"
      pendingOverlay={{
        title: 'Saving your selection',
        detail: `Recording ${selection.length} dataset${selection.length === 1 ? '' : 's'} for this context.`,
      }}
      refreshing={busy && !datasets.isPending}
      footerNote={
        selection.length > 0
          ? `${selection.length} dataset${selection.length === 1 ? '' : 's'} selected`
          : 'Select at least one dataset to continue.'
      }
      onNext={async () => {
        const savedById = new Map(saved.map((d) => [d.id, d]))
        const chosen = selection.map((id) => {
          const listed = seen.current.get(id)
          const stored = savedById.get(id)
          return {
            id,
            name: listed?.name ?? stored?.name ?? id,
            rowCount: listed?.rowCount ?? stored?.rowCount ?? null,
            columnCount: listed?.columnCount ?? stored?.columnCount ?? null,
          }
        })
        try {
          await saveSelection.mutateAsync(chosen)
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
        isEmpty={(d) => d.datasets.length === 0 && !settledSearch && d.page === 1}
        empty={
          <EmptyState
            title="This connection reports no datasets"
            detail="The credential is valid but the account can see nothing. Check its permissions in the source, then refresh."
            action={
              <Button variant="outline" size="sm" onClick={() => refresh.mutate(query)} disabled={busy}>
                <RefreshCw className="size-4" aria-hidden />
                Refresh
              </Button>
            }
          />
        }
      >
        {(data) => (
          <DatasetTable
            rows={data.datasets}
            configuredIds={savedIds}
            fetchedAt={data.fetchedAt}
            page={data.page}
            pageSize={pageSize}
            total={data.total}
            hasMore={data.hasMore}
            busy={busy}
            onPage={setPage}
            onPageSize={(size) => {
              setPageSize(size)
              setPage(1)
            }}
            searchValue={search}
            onSearch={setSearch}
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
  fetchedAt,
  page,
  pageSize,
  total,
  hasMore,
  busy,
  onPage,
  onPageSize,
  searchValue,
  onSearch,
  selectedIds,
  onToggle: toggle,
  onSetAll: setAll,
  readOnly = false,
}: {
  rows: WarehouseDataset[]
  configuredIds: string[]
  fetchedAt: string
  page: number
  pageSize: number
  total: number | null
  hasMore: boolean
  busy: boolean
  onPage: (page: number) => void
  onPageSize: (size: number) => void
  searchValue: string
  onSearch: (value: string) => void
  selectedIds: string[]
  onToggle: (id: string) => void
  onSetAll: (ids: string[]) => void
  readOnly?: boolean
}) {
  const onToggle = readOnly ? () => {} : toggle
  const onSetAll = readOnly ? () => {} : setAll

  const configured = useMemo(() => new Set(configuredIds), [configuredIds])

  const dirty = useMemo(() => {
    if (selectedIds.length !== configuredIds.length) return true
    const current = new Set(selectedIds)
    return configuredIds.some((id) => !current.has(id))
  }, [selectedIds, configuredIds])

  const columns = useMemo(() => COLUMNS.filter((c) => c.present(rows)), [rows])

  const totalPages = total === null ? null : Math.max(1, Math.ceil(total / pageSize))
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + rows.length
  const searchText = searchValue.trim()

  const selected = new Set(selectedIds)
  const currentPageIds = rows.map((r) => r.id)
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
            already configured for this connection. They stay selected as you move between pages.
          </span>
          {dirty && !readOnly ? (
            <Button variant="ghost" size="sm" className="ml-auto h-6" onClick={() => onSetAll(configuredIds)}>
              Reset to saved
            </Button>
          ) : null}
        </div>
      ) : null}

      <SearchToolbar
        search={
          <SearchBox
            value={searchValue}
            onChange={onSearch}
            placeholder="Search by name or paste a dataset ID…"
            label="Search datasets by name or dataset ID"
          />
        }
      >
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {selectedIds.length > 0 && !readOnly ? (
            <Button variant="ghost" size="sm" onClick={() => onSetAll([])}>
              Clear selection ({selectedIds.length})
            </Button>
          ) : null}
          <span>
            {total !== null
              ? `${formatCount(total)} dataset${total === 1 ? '' : 's'}`
              : `${rows.length} on this page`}
            {' · '}fetched {formatRelativeTime(fetchedAt)}
          </span>
        </div>
      </SearchToolbar>

      <div className={cn('overflow-x-auto rounded-lg border', busy && 'opacity-70')} aria-busy={busy}>
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
            {rows.map((row) => {
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
                      className={cn('px-3 py-2.5', col.align === 'right' ? 'text-right' : 'text-left')}
                    >
                      {colIndex === 0 ? (
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">{col.render(row)}</div>
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

        {rows.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-muted-foreground">
            {searchText ? `No dataset matches “${searchText}”.` : 'Nothing on this page.'}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <Select value={String(pageSize)} onValueChange={(value) => onPageSize(Number(value))} disabled={busy}>
            <SelectTrigger className="w-20" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          {rows.length > 0 ? (
            <span>
              Showing <strong className="font-semibold text-foreground">{formatCount(startIndex + 1)}</strong>–
              <strong className="font-semibold text-foreground">{formatCount(endIndex)}</strong>
              {total !== null ? (
                <>
                  {' '}of <strong className="font-semibold text-foreground">{formatCount(total)}</strong>
                </>
              ) : null}
            </span>
          ) : null}

          <div className="flex items-center gap-1">
            <Hint label="First page"><Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => onPage(1)}
              disabled={busy || page <= 1}
              aria-label="Go to first page"
            >
              <ChevronsLeft className="size-3.5" aria-hidden />
            </Button></Hint>
            <Hint label="Previous page"><Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => onPage(Math.max(1, page - 1))}
              disabled={busy || page <= 1}
              aria-label="Go to previous page"
            >
              <ChevronLeft className="size-3.5" aria-hidden />
            </Button></Hint>
            <span className="px-2 font-medium text-foreground">
              Page {formatCount(page)}{totalPages !== null ? ` of ${formatCount(totalPages)}` : ''}
            </span>
            <Hint label="Next page"><Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => onPage(page + 1)}
              disabled={busy || !hasMore}
              aria-label="Go to next page"
            >
              <ChevronRight className="size-3.5" aria-hidden />
            </Button></Hint>
            {totalPages !== null ? (
              <Hint label="Last page"><Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => onPage(totalPages)}
                disabled={busy || page >= totalPages}
                aria-label="Go to last page"
              >
                <ChevronsRight className="size-3.5" aria-hidden />
              </Button></Hint>
            ) : null}
          </div>
        </div>
      </div>

    </div>
  )
}
