import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState, ErrorState, NoResultsState, TableSkeleton } from '@/components/common/States'
import type { ListQuery } from '@/types/admin'

export interface ColumnDef<T> {
  key: string
  header: ReactNode
  render: (item: T) => ReactNode
  sortValue?: (item: T) => string | number | boolean | null | undefined
  serverSort?: string
  align?: 'left' | 'right' | 'center'
  width?: string
  secondary?: boolean
  className?: string
}

interface DataTableProps<T> {
  data: T[] | null
  columns: ColumnDef<T>[]
  keyOf: (item: T) => string | number
  loading?: boolean
  error?: unknown
  onRetry?: () => void

  searchFilter?: (item: T, query: string) => boolean
  searchPlaceholder?: string

  empty: { title: string; body?: ReactNode; action?: ReactNode }

  toolbar?: ReactNode
  onRowClick?: (item: T) => void
  pageSize?: number

  server?: {
    total: number
    query: ListQuery
    onQueryChange: (next: ListQuery) => void
    narrowed: boolean
  }
}

export function DataTable<T>({
  data,
  columns,
  keyOf,
  loading = false,
  error,
  onRetry,
  searchFilter,
  searchPlaceholder = 'Search…',
  empty,
  toolbar,
  onRowClick,
  pageSize: clientPageSize = 15,
  server,
}: DataTableProps<T>) {
  const [query, setQuery] = useState(server?.query.search ?? '')
  const [clientSortKey, setSortKey] = useState<string | null>(null)
  const [clientSortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [clientPage, setClientPage] = useState(1)

  const serverSearch = server?.query.search ?? ''
  const onServerQuery = server?.onQueryChange
  const serverQuery = server?.query
  useEffect(() => {
    if (!onServerQuery || !serverQuery) return
    const next = query.trim()
    if (next === serverSearch) return
    const timer = setTimeout(() => onServerQuery({ ...serverQuery, search: next, page: 1 }), 300)
    return () => clearTimeout(timer)
  }, [query, serverSearch, onServerQuery, serverQuery])

  const sortKey = server ? (server.query.sort ?? null) : clientSortKey
  const sortDirection = server ? (server.query.dir ?? 'asc') : clientSortDirection
  const pageSize = server ? server.query.pageSize : clientPageSize
  const page = server ? server.query.page : clientPage
  const setPage = (next: (p: number) => number) => {
    if (server) server.onQueryChange({ ...server.query, page: next(server.query.page) })
    else setClientPage(next)
  }

  const rows = useMemo(() => data ?? [], [data])

  const filtered = useMemo(() => {
    if (server) return rows
    const needle = query.trim().toLowerCase()
    if (!needle || !searchFilter) return rows
    return rows.filter((item) => searchFilter(item, needle))
  }, [rows, query, searchFilter, server])

  const sorted = useMemo(() => {
    if (server || !sortKey) return filtered
    const column = columns.find((c) => c.key === sortKey)
    if (!column?.sortValue) return filtered

    const direction = sortDirection === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const left = column.sortValue!(a)
      const right = column.sortValue!(b)

      if (left === right) return 0
      if (left === null || left === undefined) return 1
      if (right === null || right === undefined) return -1

      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * direction
      }
      return String(left).localeCompare(String(right), undefined, { numeric: true }) * direction
    })
  }, [filtered, sortKey, sortDirection, columns, server])

  const matchedCount = server ? server.total : sorted.length
  const pageCount = Math.max(1, Math.ceil(matchedCount / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visible = server ? sorted : sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const toggleSort = (key: string) => {
    if (server) {
      const column = columns.find((c) => c.key === key)
      if (!column?.serverSort) return
      const same = server.query.sort === column.serverSort
      server.onQueryChange({
        ...server.query,
        sort: column.serverSort,
        dir: same && server.query.dir !== 'desc' ? 'desc' : 'asc',
        page: 1,
      })
      return
    }
    if (clientSortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
    setClientPage(1)
  }

  const clearSearch = () => {
    setQuery('')
    if (server) server.onQueryChange({ ...server.query, search: '', page: 1 })
  }

  const hasSearch = Boolean(searchFilter || server)
  const isEmpty = server ? rows.length === 0 && !server.narrowed : rows.length === 0
  const noMatch = server ? rows.length === 0 && server.narrowed : sorted.length === 0

  const alignClass = (align: ColumnDef<T>['align']) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  const showToolbar = Boolean(hasSearch || toolbar)

  return (
    <div>
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          {hasSearch && (
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  if (!server) setClientPage(1)
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="pl-8"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {error ? (
        <ErrorState error={error} onRetry={onRetry} title="Unable to load" />
      ) : loading ? (
        <TableSkeleton columns={Math.min(columns.length, 5)} />
      ) : isEmpty || (noMatch && !query) ? (
        // Narrowed by a caller's filters rather than the search box: the caller's `empty`
        // explains it, since "Nothing matches “”" would not.
        <EmptyState title={empty.title} body={empty.body} action={empty.action} />
      ) : noMatch ? (
        <NoResultsState query={query} onClear={clearSearch} />
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map((column) => {
                    const sortable = server ? Boolean(column.serverSort) : Boolean(column.sortValue)
                    const active = server
                      ? Boolean(column.serverSort) && sortKey === column.serverSort
                      : sortKey === column.key
                    return (
                      <TableHead
                        key={column.key}
                        className={cn(
                          alignClass(column.align),
                          column.width,
                          column.secondary && 'hidden md:table-cell'
                        )}
                        aria-sort={
                          active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined
                        }
                      >
                        {sortable ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(column.key)}
                            className={cn(
                              'inline-flex items-center gap-1 rounded transition-colors hover:text-foreground',
                              active && 'text-foreground'
                            )}
                          >
                            {column.header}
                            {active ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="size-3" aria-hidden />
                              ) : (
                                <ArrowDown className="size-3" aria-hidden />
                              )
                            ) : (
                              <ChevronsUpDown className="size-3 opacity-40" aria-hidden />
                            )}
                          </button>
                        ) : (
                          column.header
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              </TableHeader>

              <TableBody>
                {visible.map((item) => (
                  <TableRow
                    key={keyOf(item)}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? 'button' : undefined}
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              onRowClick(item)
                            }
                          }
                        : undefined
                    }
                    className={cn(onRowClick && 'cursor-pointer')}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          alignClass(column.align),
                          column.secondary && 'hidden md:table-cell',
                          column.className
                        )}
                      >
                        {column.render(item)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pageCount > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground" aria-live="polite">
                Showing{' '}
                <span className="font-medium text-foreground tabular-nums">
                  {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, matchedCount)}
                </span>{' '}
                of <span className="font-medium text-foreground tabular-nums">{matchedCount}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {currentPage} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage === pageCount}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
