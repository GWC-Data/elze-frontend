import { useState } from 'react'
import { Eye, RefreshCw, X } from 'lucide-react'
import { fetchAuditLogs } from '@/api/audit.api'
import type { AuditAction, AuditCategory, AuditFilters } from '@/api/audit.api'
import { useServerList } from '@/hooks/useServerList'
import { usePaths } from '@/hooks/usePaths'
import { useAuth } from '@/context/authContext'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { DataTable, type ColumnDef } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { AuditLogEntry, AuditLogPage as AuditPage, AuditScope } from '@/types/admin'

const HEADINGS: Record<AuditScope, { title: string; description: string; empty: string }> = {
  all: {
    title: 'Audit log',
    description: 'Every administrative and authentication action, across every customer.',
    empty: 'Entries are written automatically as administrative and sign-in actions happen.',
  },
  company: {
    title: 'Audit log',
    description: 'Everything done in your company: sign-ins, people, groups, dashboards and the Metadata Lakehouse.',
    empty: 'Entries appear here as people in your company sign in and make changes.',
  },
  self: {
    title: 'My activity',
    description: 'What you have done, and what administrators have done to your account.',
    empty: 'Your sign-ins and the changes made to your account will appear here.',
  },
}

const TONE_CLASS: Record<AuditLogEntry['tone'], string> = {
  danger: 'border-destructive/25 bg-destructive/10 text-destructive',
  warning: 'border-warning/30 bg-warning/15 text-warning-foreground',
  success: 'border-success/25 bg-success/10 text-success',
  neutral: 'border-border bg-muted text-muted-foreground',
}

function inspectRows(entry: AuditLogEntry): Array<[string, unknown]> {
  return [
    ['ts', entry.ts],
    ['event', entry.event],
    ['actor', entry.actor],
    ['actorId', entry.actorId],
    ['actorCompanyId', entry.actorCompanyId],
    ['company', entry.companyName],
    ...Object.entries(entry.detail),
  ]
}

const CATEGORY_OPTIONS: { value: AuditCategory; label: string }[] = [
  { value: 'lakehouse', label: 'Metadata Lakehouse' },
  { value: 'auth', label: 'Sign-in & sessions' },
  { value: 'people', label: 'People, groups & roles' },
  { value: 'dashboards', label: 'Dashboards & access' },
  { value: 'companies', label: 'Companies' },
]

const ACTION_OPTIONS: { value: AuditAction; label: string }[] = [
  { value: 'create', label: 'Created' },
  { value: 'update', label: 'Updated' },
  { value: 'delete', label: 'Deleted' },
]

const ALL = 'all'

/** Before the first page arrives, guess the scope from the role so the heading doesn't flicker. */
function expectedScope(shell: 'platform' | 'workspace', role: string | undefined): AuditScope {
  if (shell === 'platform') return 'all'
  return role === 'COMPANY_ADMIN' ? 'company' : 'self'
}

export default function AuditLogPage() {
  const [filters, setFilters] = useState<AuditFilters>({})
  const logs = useServerList<AuditLogEntry, AuditFilters, AuditPage>(
    fetchAuditLogs,
    { page: 1, pageSize: 25, sort: 'ts', dir: 'desc' },
    filters
  )
  const setFilter = <K extends keyof AuditFilters>(key: K, value: AuditFilters[K] | undefined) =>
    setFilters((prev) => {
      const next = { ...prev }
      if (value === undefined || value === '') delete next[key]
      else next[key] = value
      return next
    })
  const filtered = Object.keys(filters).length > 0
  const today = new Date().toISOString().slice(0, 10)

  const toolbar = (
    <>
      <Select
        value={filters.category ?? ALL}
        onValueChange={(value) => setFilter('category', value === ALL ? undefined : (value as AuditCategory))}
      >
        <SelectTrigger size="sm" className="min-w-44" aria-label="Filter by area">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All areas</SelectItem>
          {CATEGORY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.action ?? ALL}
        onValueChange={(value) => setFilter('action', value === ALL ? undefined : (value as AuditAction))}
      >
        <SelectTrigger size="sm" className="min-w-32" aria-label="Filter by action">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All actions</SelectItem>
          {ACTION_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        From
        <Input
          type="date"
          className="h-7 w-36 text-xs"
          value={filters.from ?? ''}
          max={filters.to ?? today}
          onChange={(event) => setFilter('from', event.target.value)}
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        To
        <Input
          type="date"
          className="h-7 w-36 text-xs"
          value={filters.to ?? ''}
          min={filters.from}
          max={today}
          onChange={(event) => setFilter('to', event.target.value)}
        />
      </label>
      {filtered && (
        <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
          <X aria-hidden />
          Clear filters
        </Button>
      )}
    </>
  )
  const [inspecting, setInspecting] = useState<AuditLogEntry | null>(null)
  const { user } = useAuth()
  const paths = usePaths()
  const scope: AuditScope = logs.data?.scope ?? expectedScope(paths.shell, user?.role)
  const heading = HEADINGS[scope]

  const companyColumn: ColumnDef<AuditLogEntry>[] = scope === 'all'
    ? [{
        key: 'company',
        header: 'Company',
        width: 'w-44',
        secondary: true,
        render: (entry) => (
          <span className="truncate text-sm text-muted-foreground">{entry.companyName ?? 'Platform'}</span>
        ),
      }]
    : []

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      key: 'ts',
      header: 'When',
      width: 'w-44',
      serverSort: 'ts',
      render: (entry) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {new Date(entry.ts).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      width: 'w-56',
      serverSort: 'event',
      render: (entry) => (
        <Badge variant="outline" className={cn('font-medium', TONE_CLASS[entry.tone])}>
          {entry.label}
        </Badge>
      ),
    },
    {
      key: 'actor',
      header: 'Who',
      width: 'w-40',
      serverSort: 'actor',
      render: (entry) => (
        <span className="truncate text-sm text-foreground">{entry.actor ?? 'system'}</span>
      ),
    },
    ...companyColumn,
    {
      key: 'detail',
      header: 'Detail',
      secondary: true,
      render: (entry) => (
        <span className="block max-w-xl truncate text-sm text-muted-foreground">
          {entry.summary || '—'}
        </span>
      ),
    },
    {
      key: 'inspect',
      header: <span className="sr-only">Inspect</span>,
      align: 'right',
      width: 'w-14',
      render: (entry) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Inspect the ${entry.event} entry`}
          onClick={(event) => {
            event.stopPropagation()
            setInspecting(entry)
          }}
        >
          <Eye aria-hidden />
        </Button>
      ),
    },
  ]

  return (
    <Page>
      <PageHeader
        title={heading.title}
        description={heading.description}
        actions={
          <Button variant="outline" onClick={logs.reload} disabled={logs.loading || logs.refreshing}>
            <RefreshCw className={logs.loading || logs.refreshing ? 'animate-spin' : undefined} aria-hidden />
            Refresh
          </Button>
        }
      />

      <Section flush>
        <DataTable
          data={logs.error ? null : (logs.data?.items ?? null)}
          columns={columns}
          keyOf={(entry) => entry.id ?? `${entry.ts}-${entry.event}-${entry.actorId ?? 'x'}`}
          loading={logs.loading}
          error={logs.error}
          onRetry={logs.reload}
          onRowClick={setInspecting}
          toolbar={toolbar}
          searchPlaceholder="Search events, people, details…"
          server={{
            total: logs.data?.total ?? 0,
            query: logs.query,
            onQueryChange: logs.setQuery,
            narrowed: logs.narrowed,
          }}
          empty={
            filtered
              ? {
                  title: 'No matching entries',
                  body: 'Nothing matches these filters. Widen the dates or clear them.',
                  action: (
                    <Button variant="outline" size="sm" onClick={() => setFilters({})}>
                      Clear filters
                    </Button>
                  ),
                }
              : { title: 'Nothing recorded yet', body: heading.empty }
          }
        />
      </Section>

      <Dialog open={inspecting !== null} onOpenChange={(open) => !open && setInspecting(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{inspecting?.label}</DialogTitle>
            <DialogDescription>
              {inspecting ? new Date(inspecting.ts).toLocaleString() : ''}
            </DialogDescription>
          </DialogHeader>

          {inspecting && (
            <dl className="divide-y divide-border text-sm">
              {inspectRows(inspecting).map(([key, value]) => (
                <div key={key} className="flex flex-wrap items-baseline justify-between gap-3 py-2">
                  <dt className="shrink-0 text-xs text-muted-foreground">{key}</dt>
                  <dd className="min-w-0 break-all text-right font-medium text-foreground">
                    {value === null || value === undefined ? '—' : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </Page>
  )
}
