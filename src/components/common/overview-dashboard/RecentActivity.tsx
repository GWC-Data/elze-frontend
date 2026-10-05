import { Activity, AlertTriangle, CheckCircle2, MinusCircle } from 'lucide-react'
import { fetchAuditLogs } from '@/api/audit.api'
import { useAsync } from '@/hooks/useAsync'
import { formatRelativeTime } from '@/lib/format'
import { Panel, PanelEmpty, PanelList, PanelLoading, PanelRow } from './Panels'

const TONE_ICON = {
  danger: AlertTriangle,
  warning: MinusCircle,
  success: CheckCircle2,
  neutral: Activity,
} as const

// Metadata Lakehouse changes only (creates, edits, publishes, deletes): sign-ins and
// sign-outs never show here. The full trail, with filters, is the audit log.
export function RecentActivity({
  to,
  description,
  limit = 4,
}: {
  to: string
  description: string
  limit?: number
}) {
  const logs = useAsync(
    () =>
      fetchAuditLogs({
        page: 1,
        pageSize: limit,
        sort: 'ts',
        dir: 'desc',
        category: 'lakehouse',
      }),
    [limit]
  )

  const items = logs.data?.items ?? []

  return (
    <Panel title="Recent activity" description={description} to={to}>
      {logs.loading ? (
        <PanelLoading rows={4} />
      ) : logs.error ? (
        <PanelEmpty>Activity couldn’t be loaded.</PanelEmpty>
      ) : items.length === 0 ? (
        <PanelEmpty>
          No Metadata Lakehouse changes yet. Connections, versions, reviews and publishes appear here.
        </PanelEmpty>
      ) : (
        <PanelList>
          {items.map((entry) => (
            <PanelRow
              key={entry.id ?? `${entry.ts}-${entry.event}`}
              icon={TONE_ICON[entry.tone]}
              tone={entry.tone}
              title={<span className="capitalize">{entry.label}</span>}
              meta={[
                entry.actor ?? 'system',
                typeof entry.detail.connectionName === 'string' ? entry.detail.connectionName : null,
                entry.companyName,
                formatRelativeTime(entry.ts),
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          ))}
        </PanelList>
      )}
    </Panel>
  )
}
