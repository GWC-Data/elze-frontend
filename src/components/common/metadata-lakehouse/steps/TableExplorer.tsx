import { useDeferredValue, useState } from 'react'
import { useWorkflow } from '@/context/workflowContext'
import type { ReactNode } from 'react'
import { MessageCircle, Pencil, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/context/authContext'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/common/metadata-lakehouse/DataStates'
import { Pagination } from '@/components/common/Pagination'
import { serverPage } from '@/hooks/usePagination'
import { Eyebrow, Headline, Lede, MetaLine, StatusBadge } from '@/components/common/metadata-lakehouse/primitives'
import { formatExact } from '@/lib/format'
import { DEFAULT_TABLES_QUERY, useFactsByTable } from '@/hooks/useMetadataLakehouse'
import type { Fact, TableFacts } from '@/api/contextObjects.api'
import { FactEditSheet } from '@/components/common/metadata-lakehouse/steps/FactEditSheet'
import { labelFor, text } from '@/lib/factFields'
import { FieldList, FieldValue } from '@/components/common/metadata-lakehouse/steps/FieldDisplay'

export function TableExplorer({
  connectionId,
  onAskAboutTable,
}: {
  connectionId: string
  onAskAboutTable?: (tableName: string) => void
}) {
  const { can } = useAuth()
  const { readOnly } = useWorkflow()
  const canEdit = can('context.update') && !readOnly
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Fact | null>(null)
  const query = useDeferredValue(search).trim()

  const facts = useFactsByTable(connectionId, {
    ...DEFAULT_TABLES_QUERY,
    ...(query ? { search: query } : {}),
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

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <StatBadge label="Tables" value={formatExact(data.tableCount)} />
        <StatBadge label="Columns profiled" value={formatExact(columnCount)} />
        <StatBadge
          label="Needs review"
          value={formatExact(data.needsReview)}
          hint={`of ${formatExact(data.count)} facts`}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Eyebrow>Tables</Eyebrow>
          <Headline className="mt-1 text-2xl">What the agent found, table by table</Headline>
          <p className="mt-1 font-serif text-[15px] italic text-muted-foreground">
            Descriptions, column profiles, keys, lineage and usage, written from each dataset.
          </p>
        </div>
        <div className="relative w-full max-w-[260px]">
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
            placeholder="Search tables, columns, text…"
            aria-label="Search tables and what the agent wrote about them"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {data.tables.length === 0 && data.unattached.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
          Nothing matches “{search}”.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {data.tables.map((group) => (
            <TableCard key={group.table.id} group={group} onEdit={onEdit} onAskAboutTable={onAskAboutTable} />
          ))}
        </div>
      )}

      <Pagination
        {...serverPage(page, DEFAULT_TABLES_QUERY.pageSize, data.matched)}
        setPage={setPage}
        noun="tables"
      />

      {data.unattached.length > 0 ? (
        <div className="rounded-2xl border bg-card px-6 py-5">
          <Eyebrow>Other facts · {data.unattached.length}</Eyebrow>
          <Headline as="h4" className="mb-4 mt-1">Not tied to one table</Headline>
          <RelatedFacts facts={data.unattached} onEdit={onEdit} />
        </div>
      ) : null}

      <FactEditSheet connectionId={connectionId} fact={editing} onClose={() => setEditing(null)} />
    </section>
  )
}

const TABLE_PLACED = ['description', 'columns', 'row_count', 'primary_key', 'foreign_keys']

function TableCard({
  group,
  onEdit,
  onAskAboutTable,
}: {
  group: TableFacts
  onEdit?: (fact: Fact) => void
  onAskAboutTable?: (tableName: string) => void
}) {
  const { table, columns, related } = group
  const payload = table.payload
  const schema = Array.isArray(payload.columns) ? (payload.columns as Array<Record<string, unknown>>) : []
  const rowCount = typeof payload.row_count === 'number' ? payload.row_count : null
  const description = text(payload, 'description')
  const moreKeys = Object.keys(payload).filter((k) => !TABLE_PLACED.includes(k))
  const [open, setOpen] = useState(false)

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs">
      <header className="px-4 pb-4 pt-4">
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <Eyebrow>Table</Eyebrow>
            <Headline as="h4" className="mt-1 break-words text-base">
              {table.qualifiedName}
            </Headline>
            <MetaLine
              className="mt-1.5"
              items={[
                rowCount !== null ? `${formatExact(rowCount)} rows` : 'rows unknown',
                `${schema.length || columns.length} columns`,
                related.length > 0 ? `${related.length} related` : null,
                <TrustChips key="trust" fact={table} />,
              ]}
            />
          </div>
        </div>
        {description ? (
          <Lede className="mt-2.5 line-clamp-2 text-sm leading-6">{description}</Lede>
        ) : (
          <p className="mt-2.5 font-serif text-sm italic text-muted-foreground">No description generated.</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {onAskAboutTable ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onAskAboutTable(table.qualifiedName)}
            >
              <MessageCircle className="size-3" aria-hidden />
              Ask about this data
            </Button>
          ) : null}
          {onEdit ? (
            <EditButton onClick={() => onEdit(table)} label="Edit table details" small />
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            {open ? 'Hide' : 'Show'} details
          </Button>
        </div>
      </header>

      {open ? (
        <Tabs defaultValue="columns" className="border-t px-4 py-3">
          <TabsList>
            <TabsTrigger value="columns" className="text-xs">
              Columns ({Math.max(schema.length, columns.length)})
            </TabsTrigger>
            <TabsTrigger value="keys" className="text-xs">
              Keys & structure
            </TabsTrigger>
            <TabsTrigger value="related" className="text-xs">
              Lineage & usage ({related.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="columns" className="mt-3">
            <ColumnList tableName={table.qualifiedName} schema={schema} columns={columns} onEdit={onEdit} />
          </TabsContent>

          <TabsContent value="keys" className="mt-3 space-y-3">
            <KeyBlock title="Primary key" value={payload.primary_key} />
            <KeyBlock title="Foreign keys" value={payload.foreign_keys} />
            {moreKeys.length > 0 ? (
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">More details the agent recorded</p>
                <FieldList payload={payload} omit={TABLE_PLACED} />
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="related" className="mt-3">
            {related.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                The agent recorded no lineage, relationships, metrics or usage for this table.
              </p>
            ) : (
              <RelatedFacts facts={related} onEdit={onEdit} />
            )}
          </TabsContent>
        </Tabs>
      ) : null}
    </article>
  )
}

const COLUMN_PLACED = ['description', 'note', 'data_type', 'null_rate', 'distinct_count_est']

function ColumnList({
  tableName,
  schema,
  columns,
  onEdit,
}: {
  tableName: string
  schema: Array<Record<string, unknown>>
  columns: Fact[]
  onEdit?: (fact: Fact) => void
}) {
  const shortName = (fact: Fact) => fact.qualifiedName.slice(tableName.length + 1)
  const profiled = new Map(columns.map((c) => [shortName(c), c]))
  const names = [
    ...schema.map((c) => String(c.name ?? '')).filter(Boolean),
    ...columns.map(shortName).filter((n) => !schema.some((c) => String(c.name) === n)),
  ]
  if (names.length === 0) {
    return <p className="text-sm text-muted-foreground">No columns recorded.</p>
  }

  return (
    <ul className="divide-y">
      {names.map((name) => {
        const fact = profiled.get(name)
        const schemaType = schema.find((c) => String(c.name) === name)?.type
        if (!fact) {
          return (
            <li key={name} className="flex flex-wrap items-baseline gap-2 py-3">
              <span className="font-mono text-sm font-medium">{name}</span>
              {schemaType ? <TypeChip>{String(schemaType)}</TypeChip> : null}
              <span className="ml-auto text-xs text-muted-foreground">Not profiled by the agent</span>
            </li>
          )
        }
        const p = fact.payload
        const description = text(p, 'description')
        const note = text(p, 'note')
        return (
          <li key={name} className="group py-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-[15px] font-semibold">{name}</span>
              <TypeChip>{String(p.data_type ?? schemaType ?? 'unknown')}</TypeChip>
              <TrustChips fact={fact} />
              <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                <Stat label="Nulls" value={p.null_rate} />
                <Stat label="Distinct" value={p.distinct_count_est} />
                {onEdit ? <EditButton onClick={() => onEdit(fact)} label={`Edit column ${name}`} small /> : null}
              </div>
            </div>
            {description ? (
              <Lede className="mt-1.5">{description}</Lede>
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

function TrustChips({ fact }: { fact: Fact }) {
  return (
    <>
      {fact.verified ? (
        <span className="inline-flex items-center text-[11px] font-semibold text-primary">
          Verified
        </span>
      ) : (
        <StatusBadge status={fact.status === 'pending' ? 'needs review' : fact.status} />
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

function TypeChip({ children }: { children: ReactNode }) {
  return (
    <Badge variant="outline" className="font-mono text-[10px] uppercase text-muted-foreground">
      {children}
    </Badge>
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
