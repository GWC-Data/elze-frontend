import { useDeferredValue, useMemo, useState } from 'react'
import { Check, Gauge, Info, Loader2, Pencil, SkipForward, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchBox, SearchToolbar } from '@/components/common/SearchBox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
import { AiBadge, StatusBadge } from '@/components/common/metadata-lakehouse/primitives'
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

const HIGH_CONFIDENCE = 0.9

const HIGH_CONFIDENCE_LABEL = `${Math.round(HIGH_CONFIDENCE * 100)}%`

const STATUS_OPTIONS = [
  { value: 'all', label: 'All states' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'skipped', label: 'Skipped' },
]

export function ReviewStep() {
  const { connectionId, goToStep, readOnly } = useWorkflow()

  const [type, setType] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [highOnly, setHighOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const deferredSearch = useDeferredValue(search)

  const filters = useMemo(
    () => ({
      ...(type !== 'all' ? { type } : {}),
      ...(status !== 'all' ? { status } : {}),
      ...(highOnly ? { minConfidence: HIGH_CONFIDENCE } : {}),
      ...(deferredSearch.trim() ? { search: deferredSearch.trim() } : {}),
      page,
      pageSize: REVIEW_PAGE_SIZE,
    }),
    [type, status, highOnly, deferredSearch, page]
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
        filter: { minConfidence: HIGH_CONFIDENCE, status: 'pending', ...(type !== 'all' ? { type } : {}) },
      })
      notify.success(`${result.affected} item${result.affected === 1 ? '' : 's'} approved.`)
    } catch (err) {
      notify.failure('approve the high-confidence items', err)
    }
  }

  const highPending = queue.data?.highConfidence?.pending
  const bulkLabel =
    highPending === undefined
      ? `Approve all above ${HIGH_CONFIDENCE_LABEL}`
      : highPending === 0
        ? `No items above ${HIGH_CONFIDENCE_LABEL}`
        : `Approve ${highPending} above ${HIGH_CONFIDENCE_LABEL}`

  return (
    <StepFrame
      title="Review generated context"
      description={
        readOnly
          ? 'Every item in this version, as it was approved for publishing.'
          : 'Approve, edit or reject each generated item. Only approved context is published.'
      }
      actions={
        readOnly ? undefined : (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onBulkApprove}
              disabled={bulk.isPending || highPending === 0}
            >
              {bulk.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Approving…
                </>
              ) : (
                bulkLabel
              )}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`How "above ${HIGH_CONFIDENCE_LABEL}" works`}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Info className="size-4" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[300px]">
                <p className="text-xs leading-relaxed">
                  Approves every pending item whose confidence score is {HIGH_CONFIDENCE_LABEL} or higher. The
                  extraction agent scores the relationships it finds: 100% when a real foreign key backs it, lower
                  when it inferred the link from sampled values. Items without a score, such as most tables and
                  column stats, are never included. Review those yourself.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        )
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
            <SearchToolbar
              className="border-b pb-4"
              search={
                <SearchBox
                  value={search}
                  onChange={(value) => {
                    setSearch(value)
                    setPage(1)
                  }}
                  placeholder="Search items…"
                  label="Search review items"
                />
              }
            >
              <Select value={type} onValueChange={chooseType}>
                <SelectTrigger size="lg" className="min-w-44" aria-label="Filter by type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types ({data.total})</SelectItem>
                  {typeOptions(data.counts, type).map(([key, count]) => (
                    <SelectItem key={key} value={key}>
                      {typeLabel(key)} ({count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {readOnly ? null : (
                <Select
                  value={highOnly ? 'high' : 'any'}
                  onValueChange={(value) => {
                    const next = value === 'high'
                    setHighOnly(next)
                    if (next) setStatus('pending')
                    setPage(1)
                  }}
                >
                  <SelectTrigger size="lg" className="min-w-44" aria-label="Filter by confidence">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any confidence</SelectItem>
                    <SelectItem value="high">
                      ≥ {HIGH_CONFIDENCE_LABEL} confidence ({data.highConfidence?.pending ?? 0})
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value)
                  setPage(1)
                }}
              >
                <SelectTrigger size="lg" className="min-w-36" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SearchToolbar>

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

function typeOptions(counts: Record<string, number>, selected: string): Array<[string, number]> {
  const entries = Object.entries(counts)
  return selected === 'all' || selected in counts ? entries : [...entries, [selected, 0]]
}

function typeLabel(key: string) {
  const words = key.replace(/[_-]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const MEDIUM_CONFIDENCE = 0.7

function ConfidenceBadge({ value, pending }: { value: number | null; pending: boolean }) {
  const ratio =
    value === null || !Number.isFinite(value) ? null : Math.max(0, Math.min(1, value > 1 ? value / 100 : value))
  const percent = ratio === null ? null : Math.round(ratio * 100)
  const qualifies = ratio !== null && ratio >= HIGH_CONFIDENCE
  const medium = ratio !== null && !qualifies && ratio >= MEDIUM_CONFIDENCE

  const hint =
    ratio === null
      ? `The extraction agent did not score this item. It only scores the relationships it finds. "Approve above ${HIGH_CONFIDENCE_LABEL}" skips it, so review it yourself.`
      : qualifies
        ? `The agent is ${percent}% confident in this item${pending ? `, so "Approve above ${HIGH_CONFIDENCE_LABEL}" includes it.` : '.'}`
        : `The agent is ${percent}% confident in this item. That is below ${HIGH_CONFIDENCE_LABEL}, so the bulk approve skips it.`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring',
            ratio === null && 'border-dashed text-muted-foreground',
            qualifies &&
              'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
            medium &&
              'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
            ratio !== null && !qualifies && !medium && 'bg-muted text-muted-foreground'
          )}
        >
          {qualifies ? <Check className="size-3.5" aria-hidden /> : <Gauge className="size-3.5" aria-hidden />}
          {ratio === null ? 'No score' : `${percent}% confidence`}
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-[260px]">
        <p className="text-xs leading-relaxed">{hint}</p>
      </TooltipContent>
    </Tooltip>
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
          <ConfidenceBadge value={item.confidence} pending={item.status === 'pending'} />
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
