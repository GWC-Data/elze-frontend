import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { errorMessage } from '@/api/client'
import { usePaths } from '@/hooks/usePaths'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { Page, PageHeader, Section } from '@/components/common/Page'
import {
  CardGridSkeleton,
  EmptyState,
  ErrorState,
  InlineLoading,
  NoResultsState,
} from '@/components/common/States'
import { notify } from '@/lib/notify'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { SearchBox, SearchToolbar } from '@/components/common/SearchBox'
import { cn } from '@/lib/utils'
import { accessAtLeast } from '@/lib/contextAccess'
import { getConnection } from '@/api/connection.api'
import { fetchDatasetPage, saveSelection } from '@/api/dataset.api'
import type { WarehouseDataset } from '@/types/metadataLakehouse'

const PAGE_SIZE = 25

export default function ConnectionDatasetsPage() {
  const { id = '' } = useParams()
  const paths = usePaths()

  const connection = useAsync(() => getConnection(id), [id])
  const canManage = accessAtLeast(connection.data?.access, 'edit')
  const [edited, setEdited] = useState<Set<string> | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebouncedValue(query.trim(), 400)
  const [pageFor, setPageFor] = useState(search)
  if (search !== pageFor) {
    setPageFor(search)
    setPage(1)
  }
  const warehouse = useAsync(
    () => fetchDatasetPage(id, { page, pageSize: PAGE_SIZE, search }),
    [id, page, search]
  )
  const [saving, setSaving] = useState(false)
  const seen = useRef(new Map<string, WarehouseDataset>())
  useEffect(() => {
    for (const dataset of warehouse.data?.datasets ?? []) seen.current.set(dataset.id, dataset)
  }, [warehouse.data])

  const saved = useMemo(
    () => new Set((connection.data?.selectedDatasets ?? []).map((dataset) => dataset.id)),
    [connection.data]
  )
  const chosen = edited ?? saved

  const setChosen = (update: (current: Set<string>) => Set<string>) =>
    setEdited((current) => update(current ?? saved))

  const datasets: WarehouseDataset[] | null = warehouse.data?.datasets ?? null
  const visible = datasets ?? []
  const total = warehouse.data?.total ?? null
  const totalPages = total === null ? null : Math.max(1, Math.ceil(total / PAGE_SIZE))

  const dirty = saved.size !== chosen.size || [...chosen].some((datasetId) => !saved.has(datasetId))

  const save = async () => {
    if (!datasets) return
    setSaving(true)
    const savedById = new Map((connection.data?.selectedDatasets ?? []).map((dataset) => [dataset.id, dataset]))
    const payload = [...chosen].map((datasetId) => {
      const listed = seen.current.get(datasetId)
      const stored = savedById.get(datasetId)
      return {
        id: datasetId,
        name: listed?.name ?? stored?.name ?? datasetId,
        rowCount: listed?.rowCount ?? stored?.rowCount ?? null,
        columnCount: listed?.columnCount ?? stored?.columnCount ?? null,
      }
    })

    try {
      await saveSelection(id, payload)
      setEdited(null)
      connection.reload()
      notify.success(
        payload.length === 0
          ? 'Selection cleared.'
          : `${payload.length} dataset${payload.length === 1 ? '' : 's'} selected.`,
        'Saved and ready for a context to be built from them.'
      )
    } catch (err) {
      notify.failure('save the selection', err)
    } finally {
      setSaving(false)
    }
  }

  if (connection.error) {
    return (
      <Page>
        <PageHeader
          title="Connection"
          crumbs={[{ label: 'Metadata Lakehouse', to: paths.metadataLakehouse }, { label: 'Not available' }]}
        />
        <Section>
          <ErrorState
            error={connection.error}
            title="Unable to load this connection"
            onRetry={connection.reload}
          />
        </Section>
      </Page>
    )
  }

  if (connection.loading || !connection.data) {
    return (
      <Page>
        <PageHeader title="Loading connection…" />
        <CardGridSkeleton count={2} />
      </Page>
    )
  }

  const record = connection.data

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'Metadata Lakehouse', to: paths.metadataLakehouse }, { label: record.name }]}
        title={record.name}
        description={`${record.provider} · ${record.host} · token ${record.secretHint}`}
        actions={
          canManage && (
            <Button disabled={saving || !dirty || datasets === null} onClick={() => void save()}>
              {saving && <Loader2 className="animate-spin" aria-hidden />}
              {dirty ? `Save ${chosen.size} selected` : 'Saved'}
            </Button>
          )
        }
      />

      {Boolean(warehouse.error) && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground"
        >
          <p className="font-medium">The dataset list could not be loaded.</p>
          <p className="mt-0.5">
            {errorMessage(warehouse.error, 'The warehouse could not be reached.')}
          </p>
          <p className="mt-1 opacity-80">
            What is saved is shown below. It cannot be changed until the warehouse answers again.
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={warehouse.reload}>
            Try again
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {record.selectedDatasets && record.selectedDatasets.length > 0 && (
          <Section
            title="Saved selection"
            description="What a context will be built from."
            flush
          >
            <ul className="divide-y divide-border">
              {record.selectedDatasets.map((dataset) => (
                <li key={dataset.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {dataset.name || dataset.id}
                  </span>
                  <code className="shrink-0 text-xs text-muted-foreground">{dataset.id}</code>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section
          title="Datasets in this warehouse"
          description={
            datasets === null
              ? undefined
              : `${total !== null ? total.toLocaleString() : 'Datasets'} visible to this token, fetched one page at a time. Tick the ones to build a context from.`
          }
          flush
        >
          {warehouse.loading && datasets === null ? (
            <InlineLoading label="Reading the warehouse…" />
          ) : datasets === null ? null : datasets.length === 0 && !search && page === 1 ? (
            <EmptyState
              title="This token can see no datasets"
              body="The credential is valid, but the account behind it has not been given access to any dataset."
              compact
            />
          ) : (
            <>
              <div className="border-b border-border px-5 py-3">
                <SearchToolbar
                  search={
                    <SearchBox
                      value={query}
                      onChange={setQuery}
                      placeholder="Search by name or paste a dataset ID…"
                      label="Search datasets by name or dataset ID"
                    />
                  }
                />
              </div>

              {visible.length === 0 ? (
                <NoResultsState query={query} onClear={() => setQuery('')} />
              ) : (
                <ul className="divide-y divide-border">
                  {visible.map((dataset) => {
                    const ticked = chosen.has(dataset.id)
                    return (
                      <li key={dataset.id}>
                        <label
                          className={cn(
                            'flex items-center gap-3 px-5 py-2.5 transition-colors',
                            ticked ? 'bg-accent/40' : 'hover:bg-muted/50',
                            canManage ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'
                          )}
                        >
                          <Checkbox
                            checked={ticked}
                            disabled={!canManage}
                            onCheckedChange={() =>
                              setChosen((current) => {
                                const next = new Set(current)
                                if (next.has(dataset.id)) next.delete(dataset.id)
                                else next.add(dataset.id)
                                return next
                              })
                            }
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-foreground">
                              {dataset.name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {dataset.id}
                              {dataset.owner ? ` · ${dataset.owner}` : ''}
                            </span>
                          </span>
                          {dataset.rowCount !== null && (
                            <Badge variant="outline" className="shrink-0 tabular-nums">
                              {dataset.rowCount.toLocaleString()} rows
                            </Badge>
                          )}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
              <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={warehouse.loading || page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="size-3.5" aria-hidden />
                  Previous
                </Button>
                <span className="px-1 font-medium text-foreground">
                  Page {page}{totalPages !== null ? ` of ${totalPages}` : ''}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={warehouse.loading || !warehouse.data?.hasMore}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                  <ChevronRight className="size-3.5" aria-hidden />
                </Button>
              </div>
            </>
          )}
        </Section>
      </div>
    </Page>
  )
}
