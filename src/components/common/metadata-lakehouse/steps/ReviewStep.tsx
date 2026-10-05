import { useDeferredValue, useMemo, useState } from 'react'
import { Check, Loader2, Pencil, Search, SkipForward, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { StepFrame } from '@/components/common/metadata-lakehouse/StepFrame'
import { Pagination } from '@/components/common/Pagination'
import { serverPage } from '@/hooks/usePagination'
import {
  EmptyState,
  NoConnectionState,
  QueryBoundary,
  TableSkeleton,
} from '@/components/common/metadata-lakehouse/DataStates'
import { AiBadge, ConfidenceMeter, StatusBadge } from '@/components/common/metadata-lakehouse/primitives'
import { formatText } from '@/lib/format'
import { endpoints } from '@/api/endpoints'
import {
  useBulkDecide,
  useDecideReviewItem,
  useReviewQueue,
} from '@/hooks/useMetadataLakehouse'
import { useWorkflow } from '@/context/workflowContext'
import type { ReviewItem } from '@/types/metadataLakehouse'
import { FactEditSheet } from '@/components/common/metadata-lakehouse/steps/FactEditSheet'
import type { EditableFact } from '@/components/common/metadata-lakehouse/steps/FactEditSheet'

const REVIEW_PAGE_SIZE = 25

export function ReviewStep() {
  const { connectionId, goToStep, readOnly } = useWorkflow()

  const [type, setType] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const deferredSearch = useDeferredValue(search)

  const filters = useMemo(
    () => ({
      ...(type !== 'all' ? { type } : {}),
      ...(status !== 'all' ? { status } : {}),
      ...(deferredSearch.trim() ? { search: deferredSearch.trim() } : {}),
      page,
      pageSize: REVIEW_PAGE_SIZE,
    }),
    [type, status, deferredSearch, page]
  )

  const chooseType = (next: string) => {
    setType(next)
    setPage(1)
  }

  const queue = useReviewQueue(connectionId, filters)
  const decide = useDecideReviewItem(connectionId)
  const bulk = useBulkDecide(connectionId)

  const [editing, setEditing] = useState<EditableFact | null>(null)

  if (!connectionId) {
    return (
      <StepFrame title="Review generated context" hideNext>
        <NoConnectionState onConnect={() => goToStep('connect')} />
      </StepFrame>
    )
  }

  const onDecide = async (item: ReviewItem, decision: 'approve' | 'reject' | 'skip') => {
    try {
      await decide.mutateAsync({ id: item.id, decision })
      notify.success(`${item.name} ${decision}d.`)
    } catch (err) {
      notify.failure(`${decision} “${item.name}”`, err)
    }
  }

  const onBulkApprove = async () => {
    try {
      const result = await bulk.mutateAsync({
        decision: 'approve',
        filter: { minConfidence: 0.9, ...(type !== 'all' ? { type } : {}) },
      })
      notify.success(`${result.affected} item${result.affected === 1 ? '' : 's'} approved.`)
    } catch (err) {
      notify.failure('approve the high-confidence items', err)
    }
  }

  return (
    <StepFrame
      title="Review generated context"
      description={
        readOnly
          ? 'Every item in this version, as it was approved for publishing.'
          : 'Approve, edit or reject each generated item. Only approved context is published.'
      }
      actions={
        readOnly ? undefined : <Button variant="outline" size="sm" onClick={onBulkApprove} disabled={bulk.isPending}>
          {bulk.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Approving…
            </>
          ) : (
            'Approve all above 90%'
          )}
        </Button>
      }
      refreshing={queue.isFetching && !queue.isPending}
    >
      <QueryBoundary
        query={queue}
        step="Review"
        endpoint={`GET ${endpoints.context.reviewQueue(connectionId)}`}
        context="load the review queue"
        loading={<TableSkeleton rows={6} columns={4} />}
      >
        {(data) => (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-2">
              <FilterChip
                label="All"
                count={data.total}
                active={type === 'all'}
                onClick={() => chooseType('all')}
              />
              {Object.entries(data.counts).map(([key, count]) => (
                <FilterChip
                  key={key}
                  label={key}
                  count={count}
                  active={type === key}
                  onClick={() => chooseType(type === key ? 'all' : key)}
                />
              ))}

              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
                aria-label="Filter by status"
                className="ml-auto h-8 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring"
              >
                <option value="all">All states</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="skipped">Skipped</option>
              </select>

              <div className="relative w-full max-w-[200px]">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search items…"
                  aria-label="Search review items"
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>

            {data.items.length === 0 ? (
              <EmptyState
                title="Nothing to review"
                detail="No item matches the current filters."
              />
            ) : (
              <ul className="divide-y rounded-2xl border bg-card">
                {data.items.map((item) => (
                  <ReviewRow
                    key={item.id}
                    item={item}
                    pendingDecision={
                      decide.isPending && decide.variables?.id === item.id
                        ? decide.variables.decision
                        : null
                    }
                    onDecide={(decision) => onDecide(item, decision)}
                    readOnly={readOnly}
                    onEdit={() =>
                      setEditing({
                        id: item.id,
                        objectType: item.type,
                        qualifiedName: item.name,
                        payload: item.fields ?? {},
                      })
                    }
                  />
                ))}
              </ul>
            )}

            <Pagination
              {...serverPage(page, REVIEW_PAGE_SIZE, data.matched)}
              setPage={setPage}
              noun="items"
            />
          </div>
        )}
      </QueryBoundary>

      <FactEditSheet
        connectionId={connectionId}
        fact={editing}
        onClose={() => setEditing(null)}
        approvable
      />
    </StepFrame>
  )
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border-b-2 px-1 pb-1 text-sm capitalize transition-colors',
        active
          ? 'border-primary font-semibold text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      )}
    >
      {label} <span className="tabular-nums opacity-70">({count})</span>
    </button>
  )
}

function ReviewRow({
  item,
  pendingDecision,
  onDecide,
  onEdit,
  readOnly = false,
}: {
  item: ReviewItem
  pendingDecision: 'approve' | 'reject' | 'skip' | null
  onDecide: (decision: 'approve' | 'reject' | 'skip') => void
  onEdit: () => void
  readOnly?: boolean
}) {
  const busy = pendingDecision !== null
  const settled = item.status !== 'pending'

  return (
    <li
      className={cn(
        'border-l-2 px-6 py-5 transition-colors first:rounded-tl-2xl last:rounded-bl-2xl',
        item.status === 'approved' && 'border-l-primary',
        item.status === 'rejected' && 'border-l-destructive/60 opacity-60',
        item.status === 'skipped' && 'border-l-muted-foreground opacity-60',
        item.status === 'pending' && 'border-l-muted-foreground/40'
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ItemName item={item} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {item.type.replace(/_/g, ' ')}
        </span>
        {item.status === 'pending' ? <AiBadge /> : <StatusBadge status={item.status} />}
        <div className="ml-auto">
          <ConfidenceMeter value={item.confidence} />
        </div>
      </div>

      <ProfileSummary item={item} />

      {item.description ? (
        <p className="mt-2 max-w-[72ch] font-serif text-[15.5px] leading-7 text-foreground/85">{item.description}</p>
      ) : null}

      {item.downstreamImpact ? (
        <p className="mt-2 max-w-[72ch] border-l-2 border-primary/40 pl-3 font-serif text-sm italic text-muted-foreground">
          <span className="font-sans text-[11px] font-semibold uppercase not-italic tracking-[0.12em] text-primary">Note </span>
          {item.downstreamImpact}
        </p>
      ) : null}

      {item.formula ? (
        <code className="mt-1.5 block overflow-x-auto rounded bg-muted px-2 py-1 font-mono text-xs">
          {item.formula}
        </code>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="ml-auto flex items-center gap-1.5">
          {readOnly ? null : settled ? (
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="size-3.5" aria-hidden />
              Edit
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                className="h-7"
                onClick={() => onDecide('approve')}
                disabled={busy}
              >
                {pendingDecision === 'approve' ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Check className="size-3.5" aria-hidden />
                )}
                Approve
              </Button>
              <Button size="sm" variant="outline" className="h-7" onClick={onEdit}>
                <Pencil className="size-3.5" aria-hidden />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => onDecide('reject')}
                disabled={busy}
              >
                {pendingDecision === 'reject' ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <X className="size-3.5" aria-hidden />
                )}
                Reject
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => onDecide('skip')}
                disabled={busy}
              >
                {pendingDecision === 'skip' ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <SkipForward className="size-3.5" aria-hidden />
                )}
                Skip
              </Button>
            </>
          )}
        </div>
      </div>

      {formatText(item.source) !== '—' ? (
        <p className="mt-1.5 text-xs text-muted-foreground">Source: {item.source}</p>
      ) : null}
    </li>
  )
}

function ItemName({ item }: { item: ReviewItem }) {
  const cut = item.type === 'column_stats' ? item.name.lastIndexOf('.') : -1
  if (cut <= 0) return <p className="min-w-0 break-words font-serif text-lg font-semibold">{item.name}</p>
  return (
    <p className="min-w-0 break-words text-[15px]">
      <span className="text-muted-foreground">{item.name.slice(0, cut)}</span>
      <span className="mx-1 text-muted-foreground">›</span>
      <span className="font-mono font-semibold">{item.name.slice(cut + 1)}</span>
    </p>
  )
}

function ProfileSummary({ item }: { item: ReviewItem }) {
  const f = item.fields ?? {}
  const chip = (label: string, value: unknown) =>
    value === undefined || value === null || value === '' ? null : (
      <span key={label} className="text-[11px] text-muted-foreground">
        {label} <span className="font-medium text-foreground">{String(value)}</span>
      </span>
    )

  if (item.type === 'column_stats') {
    const chips = [chip('Type', f.data_type), chip('Nulls', f.null_rate), chip('Distinct', f.distinct_count_est)].filter(Boolean)
    return chips.length ? <div className="mt-1.5 flex flex-wrap gap-1.5">{chips}</div> : null
  }
  if (item.type === 'table') {
    const columns = Array.isArray(f.columns) ? f.columns.length : null
    const chips = [chip('Rows', f.row_count), chip('Columns', columns), chip('Key', f.primary_key)].filter(Boolean)
    return chips.length ? <div className="mt-1.5 flex flex-wrap gap-1.5">{chips}</div> : null
  }
  if (item.type === 'transformation') {
    const inputs = Array.isArray(f.input_tables) ? f.input_tables : []
    const output = f.output_table ?? f.output_tables
    if (!inputs.length && !output) return null
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
        {inputs.map((t, i) => (
          <span key={i} className="font-mono">
            {String(t)}
          </span>
        ))}
        <span className="font-semibold text-primary" aria-label="writes to">→</span>
        {output ? <span className="font-mono">{String(output)}</span> : null}
      </div>
    )
  }
  return null
}
