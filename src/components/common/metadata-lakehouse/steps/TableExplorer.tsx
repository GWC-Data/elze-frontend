import { createContext, useContext, useDeferredValue, useRef, useState } from 'react'
import { useWorkflow } from '@/context/workflowContext'
import type { MouseEvent, ReactNode } from 'react'
import { ArrowLeft, AtSign, Check, ChevronRight, Columns3, Filter, Loader2, Pencil, Search, Table2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/common/metadata-lakehouse/DataStates'
import { Pagination } from '@/components/common/Pagination'
import { serverPage } from '@/hooks/usePagination'
import { Eyebrow, Headline, Lede, MetaLine, StatusBadge } from '@/components/common/metadata-lakehouse/primitives'
import { formatExact } from '@/lib/format'
import { notify } from '@/lib/notify'
import { DEFAULT_TABLES_QUERY, useDecideReviewItem, useFactsByTable } from '@/hooks/useMetadataLakehouse'
import type { Fact, TableFacts } from '@/api/contextObjects.api'
import { FactEditSheet } from '@/components/common/metadata-lakehouse/steps/FactEditSheet'
import { labelFor, text } from '@/lib/factFields'
import { FieldList, FieldValue } from '@/components/common/metadata-lakehouse/steps/FieldDisplay'
import { columnMention, tableMention } from '@/components/common/metadata-lakehouse/steps/mentions'
import { Hint } from '@/components/common/Hint'
import { ReadableText } from '@/components/common/metadata-lakehouse/steps/ReadableText'
import type { MentionControls } from '@/components/common/metadata-lakehouse/steps/mentions'

interface ReviewActions {
  approve: (fact: Fact) => void
  approvingId: string | null
}

const ReviewActionsContext = createContext<ReviewActions | null>(null)

export function TableExplorer({
  connectionId,
  mention,
  narrow = false,
}: {
  connectionId: string
  mention?: MentionControls
  narrow?: boolean
}) {
  const { readOnly } = useWorkflow()
  const canEdit = !readOnly
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [reviewOnly, setReviewOnly] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Fact | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const decide = useDecideReviewItem(connectionId)
  const sectionRef = useRef<HTMLElement>(null)
  const query = useDeferredValue(search).trim()

  const facts = useFactsByTable(connectionId, {
    ...DEFAULT_TABLES_QUERY,
    ...(query ? { search: query } : {}),
    ...(reviewOnly ? { review: 'pending' as const } : {}),
    page,
  })
  const data = facts.data
  if (!data) return null

  if (data.count === 0) {
    return (
      <EmptyState
        title="This run wrote no facts"
        detail="The agent completed but recorded nothing in the Metadata Lakehouse. Its report below should say why."
      />
    )
  }

  const onEdit = canEdit ? setEditing : undefined
  const columnCount = data.counts.column_stats ?? 0
  const opened = openId ? (data.tables.find((g) => g.table.id === openId) ?? null) : null

  const openTable = (group: TableFacts) => {
    setOpenId(group.table.id)
    const top = sectionRef.current?.getBoundingClientRect().top ?? 0
    if (top < 0) sectionRef.current?.scrollIntoView({ block: 'start' })
  }

  const approve = async (fact: Fact) => {
    setApprovingId(fact.id)
    try {
      await decide.mutateAsync({ id: fact.id, decision: 'approve' })
    } catch (err) {
      notify.failure(`approve ${shortLabel(fact.qualifiedName)}`, err)
    } finally {
      setApprovingId(null)
    }
  }
  const reviewActions: ReviewActions | null = canEdit
    ? { approve: (fact) => void approve(fact), approvingId }
    : null

  const refine = (apply: () => void) => {
    apply()
    setPage(1)
    setOpenId(null)
  }

  return (
    <ReviewActionsContext.Provider value={reviewActions}>
      <section ref={sectionRef} className="scroll-mt-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatBadge label="Tables" value={formatExact(data.tableCount)} />
          <StatBadge label="Columns profiled" value={formatExact(columnCount)} />
          <ReviewFilter
            count={data.reviewCounts ? data.reviewCounts.tables + data.reviewCounts.columns : data.needsReview}
            active={reviewOnly}
            onToggle={() => refine(() => setReviewOnly((v) => !v))}
          />
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => {
                const next = e.target.value
                refine(() => setSearch(next))
              }}
              placeholder="Search tables, columns, descriptions…"
              aria-label="Search tables and what the agent wrote about them"
              className="h-10 pl-9 text-sm"
            />
          </div>
        </div>

        {opened ? (
          <TableDetail
            group={opened}
            onBack={() => setOpenId(null)}
            onEdit={onEdit}
            mention={mention}
            reviewOnly={reviewOnly}
          />
        ) : (
          <>
            {data.tables.length === 0 && (reviewOnly || data.unattached.length === 0) ? (
              <p className="rounded-lg border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
                {reviewOnly
                  ? query
                    ? `No table or column matching “${search}” is waiting for review.`
                    : 'No table or column is waiting for review.'
                  : `Nothing matches “${search}”.`}
              </p>
            ) : reviewOnly ? (
              <ReviewList groups={data.tables} onOpenTable={openTable} onEdit={onEdit} mention={mention} />
            ) : (
              <div className={cn('grid grid-cols-1 gap-3', narrow ? '2xl:grid-cols-2' : 'lg:grid-cols-2')}>
                {data.tables.map((group) => (
                  <TableCard
                    key={group.table.id}
                    group={group}
                    onOpen={() => openTable(group)}
                    onEdit={onEdit}
                    mention={mention}
                  />
                ))}
              </div>
            )}

            <Pagination
              {...serverPage(page, DEFAULT_TABLES_QUERY.pageSize, data.matched)}
              setPage={setPage}
              noun="tables"
            />

            {!reviewOnly && data.unattached.length > 0 ? (
              <div className="rounded-2xl border bg-card px-6 py-5">
                <Eyebrow>Other facts · {data.unattached.length}</Eyebrow>
                <Headline as="h4" className="mb-4 mt-1">Not tied to one table</Headline>
                <RelatedFacts facts={data.unattached} onEdit={onEdit} />
              </div>
            ) : null}
          </>
        )}

        <FactEditSheet connectionId={connectionId} fact={editing} onClose={() => setEditing(null)} />
      </section>
    </ReviewActionsContext.Provider>
  )
}

function ReviewFilter({
  count,
  active,
  onToggle,
}: {
  count: number
  active: boolean
  onToggle: () => void
}) {
  return (
    <Hint label={active ? 'Show every table again' : 'Show only the tables and columns that need review'}>
      <button
        type="button"
        aria-pressed={active}
        disabled={count === 0 && !active}
        onClick={onToggle}
        className={cn(
          'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          active
            ? 'border-warning/40 bg-warning/15 text-warning-foreground'
            : 'bg-muted/40 text-muted-foreground hover:border-warning/40 hover:bg-warning/10'
        )}
      >
        <Filter className="size-3" aria-hidden />
        Needs review
        <span className="font-semibold text-foreground tabular-nums">{formatExact(count)}</span>
        {active ? <X className="size-3" aria-hidden /> : null}
      </button>
    </Hint>
  )
}

function ReviewList({
  groups,
  onOpenTable,
  onEdit,
  mention,
}: {
  groups: TableFacts[]
  onOpenTable: (group: TableFacts) => void
  onEdit?: (fact: Fact) => void
  mention?: MentionControls
}) {
  const items = groups.flatMap((group) => [
    ...(group.table.status === 'pending' ? [{ fact: group.table, group, kind: 'table' as const }] : []),
    ...group.columns
      .filter((column) => column.status === 'pending')
      .map((fact) => ({ fact, group, kind: 'column' as const })),
  ])
  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
      {items.map(({ fact, group, kind }) => {
        const row =
          kind === 'table'
            ? tableMention(fact, mention?.datasetNames)
            : columnMention(fact, group.table.qualifiedName)
        const mentioned = Boolean(mention?.mentions.some((m) => m.id === fact.id))
        const open = () => onOpenTable(group)
        return (
          <li
            key={fact.id}
            className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3', mentioned && 'bg-primary/5')}
          >
            {kind === 'table' ? (
              <Table2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <Columns3 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              {kind === 'table' ? (
                <button
                  type="button"
                  onClick={open}
                  className="cursor-pointer break-words text-left text-sm font-semibold hover:text-primary hover:underline"
                >
                  {fact.qualifiedName}
                </button>
              ) : (
                <p className="break-words">
                  <span className="font-mono text-sm font-semibold">{row.label}</span>
                  <button
                    type="button"
                    onClick={open}
                    className="ml-2 cursor-pointer text-left text-xs text-muted-foreground hover:text-primary hover:underline"
                  >
                    in {group.table.qualifiedName}
                  </button>
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <TrustChips fact={fact} />
              {mention ? (
                <MentionButton
                  name={kind === 'table' ? row.label : `column ${row.label}`}
                  active={mentioned}
                  onClick={() => mention.onToggle(row)}
                  iconOnly
                />
              ) : null}
              {onEdit ? (
                <EditButton
                  onClick={() => onEdit(fact)}
                  label={kind === 'table' ? 'Edit table details' : `Edit column ${row.label}`}
                  small
                />
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

const TABLE_PLACED = ['description', 'columns', 'row_count', 'primary_key', 'foreign_keys']

function isPick(event: MouseEvent<HTMLElement>): boolean {
  const target = event.target as HTMLElement
  if (target.closest('a, button, input, textarea, [role="tab"], [role="menuitem"], [role="option"]')) {
    return false
  }
  return !window.getSelection()?.toString()
}

function tableShape(table: Fact) {
  const payload = table.payload
  return {
    payload,
    schema: Array.isArray(payload.columns) ? (payload.columns as Array<Record<string, unknown>>) : [],
    description: text(payload, 'description'),
  }
}

function NeedsReviewChip({ count }: { count: number | undefined }) {
  if (!count) return null
  return (
    <span className="rounded-full border border-warning/30 bg-warning/15 px-1.5 text-[11px] text-warning-foreground">
      {formatExact(count)} need{count === 1 ? 's' : ''} review
    </span>
  )
}

function TableCard({
  group,
  onOpen,
  onEdit,
  mention,
}: {
  group: TableFacts
  onOpen: () => void
  onEdit?: (fact: Fact) => void
  mention?: MentionControls
}) {
  const { table, columns, related } = group
  const mentioned = Boolean(mention?.mentions.some((m) => m.id === table.id))
  const { schema, description } = tableShape(table)

  return (
    <article
      onClick={(event) => isPick(event) && onOpen()}
      className={cn(
        'group/card flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-colors hover:border-primary/40',
        mentioned && 'ring-2 ring-primary/60'
      )}
    >
      <header className="px-4 pb-4 pt-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Eyebrow>Table</Eyebrow>
            <Headline as="h4" className="mt-1 break-words text-base">
              <button
                type="button"
                onClick={onOpen}
                className="cursor-pointer text-left hover:text-primary hover:underline"
              >
                {table.qualifiedName}
              </button>
            </Headline>
            <MetaLine
              className="mt-1.5"
              items={[
                `${schema.length || columns.length} columns`,
                related.length > 0 ? `${related.length} related` : null,
                <TrustChips key="trust" fact={table} hidePending />,
                group.needsReview ? <NeedsReviewChip key="review" count={group.needsReview} /> : null,
              ]}
            />
          </div>
          <ChevronRight
            className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover/card:translate-x-0.5 group-hover/card:text-primary"
            aria-hidden
          />
        </div>
        {description ? (
          <Lede className="mt-2.5 line-clamp-2 text-sm leading-6">{description}</Lede>
        ) : (
          <p className="mt-2.5 font-serif text-sm italic text-muted-foreground">No description generated.</p>
        )}
        {mention || onEdit ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {mention ? (
              <MentionButton
                name={table.qualifiedName}
                active={mentioned}
                onClick={() => mention.onToggle(tableMention(table, mention.datasetNames))}
              />
            ) : null}
            {onEdit ? (
              <EditButton onClick={() => onEdit(table)} label="Edit table details" small />
            ) : null}
          </div>
        ) : null}
      </header>
    </article>
  )
}

function TableDetail({
  group,
  onBack,
  onEdit,
  mention,
  reviewOnly,
}: {
  group: TableFacts
  onBack: () => void
  onEdit?: (fact: Fact) => void
  mention?: MentionControls
  reviewOnly: boolean
}) {
  const { table, columns, related } = group
  const mentioned = Boolean(mention?.mentions.some((m) => m.id === table.id))
  const { payload, schema, description } = tableShape(table)
  const moreKeys = Object.keys(payload).filter((k) => !TABLE_PLACED.includes(k))
  const columnTotal = reviewOnly ? columns.length : Math.max(schema.length, columns.length)

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <header className="border-b px-5 pb-5 pt-3">
        <Button variant="ghost" size="sm" className="-ml-2 h-7 px-2 text-xs" onClick={onBack}>
          <ArrowLeft className="size-3.5" aria-hidden />
          All tables
        </Button>
        <Eyebrow className="mt-3">Table</Eyebrow>
        <Headline as="h3" className="mt-1 break-words text-2xl">
          {table.qualifiedName}
        </Headline>
        <MetaLine
          className="mt-2"
          items={[
            `${schema.length || columns.length} columns`,
            related.length > 0 ? `${related.length} related` : null,
            <TrustChips key="trust" fact={table} />,
          ]}
        />
        {description ? (
          <ReadableText text={description} className="mt-3" />
        ) : (
          <p className="mt-3 font-serif text-sm italic text-muted-foreground">No description generated.</p>
        )}
        {mention || onEdit ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {mention ? (
              <MentionButton
                name={table.qualifiedName}
                active={mentioned}
                onClick={() => mention.onToggle(tableMention(table, mention.datasetNames))}
              />
            ) : null}
            {onEdit ? (
              <EditButton onClick={() => onEdit(table)} label="Edit table details" small />
            ) : null}
          </div>
        ) : null}
      </header>

      <DetailSection title={reviewOnly ? `Columns needing review (${columnTotal})` : `Columns (${columnTotal})`}>
        <ColumnList
          tableName={table.qualifiedName}
          schema={schema}
          columns={columns}
          onEdit={onEdit}
          mention={mention}
          reviewOnly={reviewOnly}
        />
      </DetailSection>

      <DetailSection title="Keys & structure">
        <div className="space-y-3">
          <KeyBlock title="Primary key" value={payload.primary_key} />
          <KeyBlock title="Foreign keys" value={payload.foreign_keys} />
          {moreKeys.length > 0 ? (
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">More details the agent recorded</p>
              <FieldList payload={payload} omit={TABLE_PLACED} />
            </div>
          ) : null}
        </div>
      </DetailSection>

      <DetailSection
        title={reviewOnly ? `Lineage & usage needing review (${related.length})` : `Lineage & usage (${related.length})`}
      >
        {related.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            {reviewOnly
              ? 'Nothing in its lineage or usage is waiting for review.'
              : 'The agent recorded no lineage, relationships, metrics or usage for this table.'}
          </p>
        ) : (
          <RelatedFacts facts={related} onEdit={onEdit} />
        )}
      </DetailSection>
    </article>
  )
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b px-5 py-4 last:border-b-0">
      <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h4>
      {children}
    </section>
  )
}

const COLUMN_PLACED = ['description', 'note', 'data_type', 'null_rate', 'distinct_count_est']

function ColumnList({
  tableName,
  schema,
  columns,
  onEdit,
  mention,
  reviewOnly = false,
}: {
  tableName: string
  schema: Array<Record<string, unknown>>
  columns: Fact[]
  onEdit?: (fact: Fact) => void
  mention?: MentionControls
  reviewOnly?: boolean
}) {
  const shortName = (fact: Fact) => fact.qualifiedName.slice(tableName.length + 1)
  const profiled = new Map(columns.map((c) => [shortName(c), c]))
  const names = reviewOnly
    ? columns.map(shortName)
    : [
        ...schema.map((c) => String(c.name ?? '')).filter(Boolean),
        ...columns.map(shortName).filter((n) => !schema.some((c) => String(c.name) === n)),
      ]
  if (names.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {reviewOnly ? 'No column of this table is waiting for review.' : 'No columns recorded.'}
      </p>
    )
  }

  return (
    <ul className="divide-y">
      {names.map((name) => {
        const fact = profiled.get(name)
        if (!fact) {
          return (
            <li key={name} className="flex flex-wrap items-baseline gap-2 py-3">
              <span className="font-mono text-sm font-medium">{name}</span>
              <span className="ml-auto text-xs text-muted-foreground">Not profiled by the agent</span>
            </li>
          )
        }
        const p = fact.payload
        const description = text(p, 'description')
        const note = text(p, 'note')
        const mentioned = Boolean(mention?.mentions.some((m) => m.id === fact.id))
        return (
          <li
            key={name}
            className={cn('group py-4', mentioned && '-mx-2 rounded-md bg-primary/5 px-2 ring-1 ring-primary/40')}
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-[15px] font-semibold">{name}</span>
              <TrustChips fact={fact} />
              <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                <Stat label="Nulls" value={p.null_rate} />
                <Stat label="Distinct" value={p.distinct_count_est} />
                {mention ? (
                  <MentionButton
                    name={`column ${name}`}
                    active={mentioned}
                    onClick={() => mention.onToggle(columnMention(fact, tableName))}
                    iconOnly
                  />
                ) : null}
                {onEdit ? <EditButton onClick={() => onEdit(fact)} label={`Edit column ${name}`} small /> : null}
              </div>
            </div>
            {description ? (
              <ReadableText text={description} className="mt-1.5" />
            ) : null}
            {note ? (
              <p className="mt-2 max-w-[72ch] border-l-2 border-primary/40 pl-3 font-serif text-sm italic text-muted-foreground">
                <span className="font-sans text-[11px] font-semibold uppercase not-italic tracking-[0.12em] text-primary">Note </span>
                {note}
              </p>
            ) : null}
            <FieldList payload={p} omit={COLUMN_PLACED} className="mt-2" />
          </li>
        )
      })}
    </ul>
  )
}

const TYPE_LABELS: Record<string, string> = {
  transformation: 'Lineage (dataflows)',
  join: 'Relationships',
  metric: 'Metrics & calculated fields',
  example: 'Usage (cards & examples)',
  glossary: 'Glossary terms',
}

function RelatedFacts({ facts, onEdit }: { facts: Fact[]; onEdit?: (fact: Fact) => void }) {
  const byType = new Map<string, Fact[]>()
  for (const fact of facts) byType.set(fact.objectType, [...(byType.get(fact.objectType) ?? []), fact])

  return (
    <div className="space-y-4">
      {[...byType.entries()].map(([type, list]) => (
        <RelatedGroup key={type} type={type} facts={list} onEdit={onEdit} />
      ))}
    </div>
  )
}

const PREVIEW = 6

function RelatedGroup({ type, facts, onEdit }: { type: string; facts: Fact[]; onEdit?: (fact: Fact) => void }) {
  const [all, setAll] = useState(false)
  const label = TYPE_LABELS[type] ?? labelFor(type)
  const shown = all ? facts : facts.slice(0, PREVIEW)
  return (
    <div>
      <Eyebrow className="mb-3">
        {label} <span className="font-normal text-muted-foreground">· {facts.length}</span>
      </Eyebrow>
      <ul className={cn('grid gap-2', type === 'metric' && 'md:grid-cols-2')}>
        {shown.map((fact) =>
          type === 'transformation' ? (
            <LineageCard key={fact.id} fact={fact} onEdit={onEdit} />
          ) : (
            <FactCard key={fact.id} fact={fact} onEdit={onEdit} />
          )
        )}
      </ul>
      {facts.length > PREVIEW ? (
        <Button variant="link" size="sm" className="mt-1 h-auto px-0 text-xs" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${facts.length}`}
        </Button>
      ) : null}
    </div>
  )
}

function LineageCard({ fact, onEdit }: { fact: Fact; onEdit?: (fact: Fact) => void }) {
  const p = fact.payload
  const inputs = Array.isArray(p.input_tables) ? p.input_tables : p.input_tables ? [p.input_tables] : []
  const output = p.output_table ?? p.output_tables
  const summary = text(p, 'logic_summary') ?? text(p, 'description')
  return (
    <li className="border-l-2 border-l-primary/60 py-1 pl-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="min-w-0 break-words font-serif text-base font-semibold">{fact.qualifiedName}</span>
        <TrustChips fact={fact} />
        {onEdit ? <EditButton onClick={() => onEdit(fact)} label="Edit lineage details" small className="ml-auto" /> : null}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
        <div className="flex flex-wrap gap-1">
          {inputs.length ? (
            inputs.map((t, i) => <Pill key={i}>{String(t)}</Pill>)
          ) : (
            <span className="text-muted-foreground">no inputs recorded</span>
          )}
        </div>
        <span className="shrink-0 font-semibold text-primary" aria-label="writes to">→</span>
        {output ? <FieldValue value={output} /> : <span className="text-muted-foreground">no output recorded</span>}
      </div>
      {summary ? <Lede className="mt-2">{summary}</Lede> : null}
      <FieldList
        payload={p}
        omit={['input_tables', 'output_table', 'output_tables', 'logic_summary', 'description']}
        className="mt-2"
      />
    </li>
  )
}

function FactCard({ fact, onEdit }: { fact: Fact; onEdit?: (fact: Fact) => void }) {
  const p = fact.payload
  const description = text(p, 'description')
  const formula = text(p, 'formula')
  return (
    <li className="border-l-2 border-l-border py-1 pl-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="min-w-0 break-words font-serif text-base font-semibold">{shortLabel(fact.qualifiedName)}</span>
        <TrustChips fact={fact} />
        {onEdit ? <EditButton onClick={() => onEdit(fact)} label="Edit details" small className="ml-auto" /> : null}
      </div>
      {description ? <Lede className="mt-1.5">{description}</Lede> : null}
      {formula ? (
        <pre className="mt-2 overflow-x-auto rounded-md bg-muted px-2.5 py-2 font-mono text-[11px] leading-relaxed">
          {formula}
        </pre>
      ) : null}
      <FieldList payload={p} omit={['description', 'formula']} className="mt-2" />
    </li>
  )
}

function shortLabel(qualifiedName: string): string {
  const cut = qualifiedName.lastIndexOf('.')
  return cut > 0 && cut < qualifiedName.length - 1 ? qualifiedName.slice(cut + 1) : qualifiedName
}

function TrustChips({ fact, hidePending = false }: { fact: Fact; hidePending?: boolean }) {
  const actions = useContext(ReviewActionsContext)
  const approving = actions?.approvingId === fact.id
  return (
    <>
      {fact.status === 'pending' ? (
        hidePending ? null : (
          <>
            <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
              Needs review
            </span>
            {actions ? (
              <Button
                variant="outline"
                size="sm"
                className="h-6 gap-1 px-2 text-[11px]"
                disabled={approving}
                onClick={() => actions.approve(fact)}
                aria-label={`Approve ${fact.qualifiedName}`}
              >
                {approving ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Check className="size-3" aria-hidden />}
                Approve
              </Button>
            ) : null}
          </>
        )
      ) : fact.status === 'approved' || fact.verified ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
          <Check className="size-3" aria-hidden />
          Approved
        </span>
      ) : (
        <StatusBadge status={fact.status} />
      )}
      {fact.edited ? (
        <span className="inline-flex items-center text-[11px] italic text-foreground">
          Edited
        </span>
      ) : null}
    </>
  )
}

function StatBadge({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
      {label}
      <span className="font-semibold text-foreground tabular-nums">{value}</span>
      {hint ? <span className="text-muted-foreground/80">{hint}</span> : null}
    </span>
  )
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px]">{children}</span>
}

function Stat({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <span>
      {label} <span className="font-medium text-foreground tabular-nums">{String(value)}</span>
    </span>
  )
}

function KeyBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="border-l-2 border-l-border py-1 pl-4">
      <Eyebrow className="mb-1.5">{title}</Eyebrow>
      {Array.isArray(value) ? (
        value.length ? (
          <ul className="space-y-1 text-sm">
            {value.map((entry, i) => (
              <li key={i}>
                <FieldValue value={entry} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">None recorded.</p>
        )
      ) : (
        <p className="text-sm">
          <FieldValue value={value ?? 'None recorded.'} />
        </p>
      )}
    </div>
  )
}

function MentionButton({
  onClick,
  name,
  active = false,
  iconOnly = false,
}: {
  onClick: () => void
  name: string
  active?: boolean
  iconOnly?: boolean
}) {
  const label = active ? `Remove ${name} from the chat` : `Mention ${name} in the chat`
  return (
    <Hint label={label}>
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={cn(
          'h-7 text-xs',
          iconOnly ? 'w-7 px-0' : 'px-2',
          active && 'border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
        )}
      >
        {active && !iconOnly ? <Check className="size-3" aria-hidden /> : <AtSign className="size-3" aria-hidden />}
        {iconOnly ? null : active ? 'Mentioned' : 'Mention'}
      </Button>
    </Hint>
  )
}

function EditButton({
  onClick,
  label,
  small = false,
  className,
}: {
  onClick: () => void
  label: string
  small?: boolean
  className?: string
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      aria-label={label}
      className={cn(small && 'h-7 px-2 text-xs', className)}
    >
      <Pencil className={small ? 'size-3' : 'size-3.5'} aria-hidden />
      Edit
    </Button>
  )
}
