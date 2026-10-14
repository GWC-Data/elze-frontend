import { useState } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, CalendarClock, Check, Copy, Hash, KeyRound, Layers, RefreshCw, ShieldCheck, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Eyebrow } from '@/components/common/metadata-lakehouse/primitives'
import { VersionBadge } from '@/components/common/metadata-lakehouse/VersionBadge'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/notify'
import { connectorPresentation } from '@/lib/connectors'
import { EMPTY, formatCount, formatDateTime, formatRelativeTime, maskSecretHint } from '@/lib/format'
import type { Connection, SelectedDataset } from '@/types/metadataLakehouse'

const DATASETS_SHOWN = 6

function providerName(provider: string): string {
  return provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : EMPTY
}

function formatDay(value: string | null): string {
  if (!value) return EMPTY
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return EMPTY
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ConnectionOverview({
  connection: c,
  canVerify,
  verifying,
  onVerify,
}: {
  connection: Connection
  canVerify: boolean
  verifying: boolean
  onVerify: () => void
}) {
  const connected = c.status === 'connected'
  const datasetCount = c.selectedDatasetCount ?? c.selectedDatasets?.length ?? 0

  return (
    <div className="space-y-4">
      <Hero connection={c} connected={connected} canVerify={canVerify} verifying={verifying} onVerify={onVerify} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Layers}
          tone="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"
          label="Datasets"
          value={formatCount(datasetCount)}
          hint="selected for this context"
        />
        <StatCard
          icon={ShieldCheck}
          tone={
            connected
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300'
          }
          label="Last verified"
          value={formatRelativeTime(c.lastVerifiedAt)}
          hint={formatDateTime(c.lastVerifiedAt)}
        />
        <StatCard
          icon={CalendarClock}
          tone="bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300"
          label="Connected"
          value={formatDay(c.createdAt)}
          hint={formatRelativeTime(c.createdAt)}
        />
      </div>

      <DatasetsPanel datasets={c.selectedDatasets ?? []} count={datasetCount} />
    </div>
  )
}

function Hero({
  connection: c,
  connected,
  canVerify,
  verifying,
  onVerify,
}: {
  connection: Connection
  connected: boolean
  canVerify: boolean
  verifying: boolean
  onVerify: () => void
}) {
  const presentation = connectorPresentation(c.provider)
  const version = c.context ?? c.published ?? null

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/[0.08] via-card to-card p-6 shadow-xs">
      <presentation.icon
        aria-hidden
        className="pointer-events-none absolute -right-6 -bottom-10 size-44 text-primary/[0.06]"
      />

      <div className="relative flex flex-wrap items-start gap-5">
        <span
          className={cn(
            'flex size-16 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-black/5',
            presentation.accentClass
          )}
        >
          <presentation.icon className="size-8" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h3 className="truncate font-serif text-3xl font-semibold leading-tight tracking-tight">{c.name}</h3>
            <StatusPill connected={connected} />
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground" title={c.host}>
            {providerName(c.provider)} · {c.host || EMPTY}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Chip icon={KeyRound}>
              <span className="font-mono">{maskSecretHint(c.secretHint)}</span>
            </Chip>
            <IdChip id={c.id} />
            {version ? <VersionBadge status={version.status} label={version.label} /> : null}
          </div>
        </div>

        {canVerify ? (
          <Button size="sm" variant="outline" className="shrink-0 bg-background/80" disabled={verifying} onClick={onVerify}>
            <RefreshCw className={cn('size-4', verifying && 'animate-spin')} aria-hidden />
            {verifying ? 'Checking…' : 'Verify'}
          </Button>
        ) : null}
      </div>

      {!connected && c.lastError ? (
        <div className="relative mt-5 flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="line-clamp-3">{c.lastError}</p>
        </div>
      ) : null}
    </section>
  )
}

function StatusPill({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        connected
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
      )}
    >
      <span className="relative flex size-2">
        {connected ? <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" aria-hidden /> : null}
        <span className={cn('relative size-2 rounded-full', connected ? 'bg-emerald-500' : 'bg-rose-500')} aria-hidden />
      </span>
      {connected ? 'Live' : 'Not working'}
    </span>
  )
}

function Chip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1 text-xs text-foreground/80 backdrop-blur-sm">
      <Icon className="size-3.5 text-muted-foreground" aria-hidden />
      {children}
    </span>
  )
}

function IdChip({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
      notify.success('Connection ID copied.')
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      notify.error("Couldn't copy the connection ID.")
    }
  }

  return (
    <Chip icon={Hash}>
      <span className="font-mono" title={id}>
        {id.slice(0, 8)}…
      </span>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label="Copy connection ID"
        className="-mr-1 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      </button>
    </Chip>
  )
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: LucideIcon
  tone: string
  label: string
  value: ReactNode
  hint?: ReactNode
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-xs">
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', tone)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="truncate font-serif text-xl font-semibold leading-snug tabular-nums">{value}</p>
        {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )
}

function DatasetsPanel({ datasets, count }: { datasets: SelectedDataset[]; count: number }) {
  const sorted = [...datasets].sort((a, b) => (b.rowCount ?? 0) - (a.rowCount ?? 0))
  const shown = sorted.slice(0, DATASETS_SHOWN)
  const hidden = count - shown.length
  const largest = Math.max(1, ...shown.map((d) => d.rowCount ?? 0))

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>Selected datasets</Eyebrow>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums">{count}</span>
      </div>

      {shown.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {shown.map((d) => (
            <DatasetCard key={d.id} dataset={d} share={(d.rowCount ?? 0) / largest} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
          {count > 0
            ? `${count} dataset${count === 1 ? '' : 's'} selected.`
            : 'No datasets selected yet. Choose them in Discover.'}
        </p>
      )}

      {shown.length > 0 && hidden > 0 ? <p className="mt-3 text-xs text-muted-foreground">+{hidden} more</p> : null}
    </section>
  )
}

function DatasetCard({ dataset: d, share }: { dataset: SelectedDataset; share: number }) {
  const width = d.rowCount ? Math.max(4, Math.round(share * 100)) : 0

  return (
    <li className="rounded-xl border bg-background/60 p-3.5 transition-colors hover:border-primary/30 hover:bg-accent/30">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Table2 className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={d.name ?? d.id}>
            {d.name ?? d.id}
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatCount(d.rowCount)} rows · {formatCount(d.columnCount)} columns
          </p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-primary/70" style={{ width: `${width}%` }} />
      </div>
    </li>
  )
}
