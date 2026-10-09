import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Layers } from 'lucide-react'
import { usePaths } from '@/hooks/usePaths'
import { formatDateTime, formatRelativeTime } from '@/lib/format'
import type { PublishedContextRow } from '@/lib/lakehouseStats'
import { PanelEmpty, PanelLoading } from './Panels'

export function LakehouseSection({
  contexts,
  loading,
  error,
  enabled,
  platform,
}: {
  contexts: PublishedContextRow[]
  loading: boolean
  error: boolean
  enabled: boolean
  platform?: boolean
}) {
  const paths = usePaths()
  const navigate = useNavigate()

  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-primary/25 bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Layers className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-card-foreground">Metadata Lakehouse</h2>
            <p className="text-xs text-muted-foreground">
              {platform ? 'Published contexts, by the company that created them' : 'Your company’s published contexts'}
            </p>
          </div>
        </div>
        {enabled && (
          <Link
            to={paths.metadataLakehouse}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Open Lakehouse
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>

      {!enabled ? (
        <PanelEmpty>The Metadata Lakehouse isn’t enabled for your role.</PanelEmpty>
      ) : loading ? (
        <PanelLoading rows={3} />
      ) : error ? (
        <PanelEmpty>Published contexts couldn’t be loaded. Try refreshing the page.</PanelEmpty>
      ) : contexts.length === 0 ? (
        <PanelEmpty>No context has been published yet.</PanelEmpty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-5 py-2.5 font-medium">Company</th>
                <th className="px-3 py-2.5 font-medium">Context</th>
                <th className="px-3 py-2.5 font-medium">Version</th>
                <th className="px-3 py-2.5 font-medium">Source</th>
                <th className="px-3 py-2.5 text-right font-medium">Facts</th>
                <th className="px-3 py-2.5 font-medium">Published by</th>
                <th className="px-5 py-2.5 font-medium">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contexts.map((row) => {
                const target = paths.metadataLakehouseBuilder(row.connectionId, row.versionId)
                return (
                  <tr
                    key={`${row.connectionId}-${row.name}`}
                    role="link"
                    tabIndex={0}
                    aria-label={`Open ${row.name} ${row.label}${row.companyName ? ` from ${row.companyName}` : ''}`}
                    onClick={() => navigate(target)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(target)
                      }
                    }}
                    className="group cursor-pointer transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <td className="px-5 py-2.5 font-medium text-foreground">{row.companyName ?? '—'}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground group-hover:text-primary">
                      {row.name}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {row.label}
                      {row.versionCount > 1 && <span className="ml-1 text-xs">({row.versionCount} published)</span>}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {row.connectionName}
                      <span className="ml-1 text-xs capitalize">· {row.provider}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{row.objectCount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.publishedBy ?? '—'}</td>
                    <td className="px-5 py-2.5 text-muted-foreground" title={formatDateTime(row.publishedAt)}>
                      <span className="inline-flex items-center gap-2">
                        {formatRelativeTime(row.publishedAt)}
                        <ArrowRight
                          className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                          aria-hidden
                        />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
