import type { CompanyPublished, Connection } from '@/types/metadataLakehouse'

/** One published context as the Overview lists it: its live (newest) version. */
export interface PublishedContextRow {
  connectionId: string
  connectionName: string
  provider: string
  companyId: number | null
  companyName: string | null
  name: string
  versionId: string
  label: string
  versionCount: number
  objectCount: number
  publishedAt: string
  publishedBy: string | null
}

export interface LakehouseAttention {
  connectionId: string
  connectionName: string
  kind: 'invalid' | 'draft'
  detail: string
}

/** Newest publish first. */
export function publishedContexts(published: CompanyPublished | null): PublishedContextRow[] {
  if (!published) return []
  return published.items
    .map((group) => {
      const live = group.versions.find((v) => v.live) ?? group.versions[0]
      return live
        ? {
            connectionId: group.connectionId,
            connectionName: group.connectionName,
            provider: group.provider,
            companyId: group.companyId,
            companyName: group.companyName,
            name: group.name,
            versionId: live.id,
            label: live.label,
            versionCount: group.versions.length,
            objectCount: live.objectCount,
            publishedAt: live.publishedAt,
            publishedBy: live.publishedBy,
          }
        : null
    })
    .filter((row): row is PublishedContextRow => row !== null)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

/** Connections failing verification, or with a draft waiting to be published. */
export function lakehouseAttention(connections: Connection[]): LakehouseAttention[] {
  const attention: LakehouseAttention[] = []
  for (const c of connections) {
    if (c.status === 'invalid') {
      attention.push({
        connectionId: c.id,
        connectionName: c.name,
        kind: 'invalid',
        detail: c.lastError ? `Verification failed: ${c.lastError}` : 'Verification failed',
      })
    } else if (c.context?.status === 'draft') {
      attention.push({
        connectionId: c.id,
        connectionName: c.name,
        kind: 'draft',
        detail: `${c.context.label || 'Draft'} is waiting to be reviewed and published`,
      })
    }
  }
  return attention.slice(0, 5)
}
