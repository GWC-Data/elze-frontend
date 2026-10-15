import { useMemo } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { useConnections } from '@/hooks/useMetadataLakehouse'
import type { Connection } from '@/types/metadataLakehouse'
import type { AdkSessionSummary } from '@/types/adk'

export interface ConnectionItem<T> {
  connection: Connection
  item: T
}

export interface AcrossConnections<T> {
  connections: Connection[] | null
  items: ConnectionItem<T>[] | null
  failed: Connection[]
  loading: boolean
  error: unknown
  reload: () => void
}

export function useAcrossConnections<T>(
  load: (connectionId: string) => Promise<T[]>,
  key: string,
  include?: (connection: Connection) => boolean
): AcrossConnections<T> {
  const connections = useConnections()
  const everything = connections.data
  const list = useMemo(
    () => (everything ? (include ? everything.filter(include) : everything) : null),
    [everything, include]
  )
  const ids = list ? list.map((c) => c.id).join(',') : null

  const results = useAsync(async () => {
    if (!list) return null
    const settled = await Promise.allSettled(list.map((c) => load(c.id)))
    return settled.map((outcome, index) => ({
      connection: list[index],
      items: outcome.status === 'fulfilled' ? outcome.value : null,
    }))
  }, [key, ids])

  return useMemo(() => {
    const groups = results.data
    return {
      connections: list,
      items: groups
        ? groups.flatMap((group) => (group.items ?? []).map((item) => ({ connection: group.connection, item })))
        : null,
      failed: groups ? groups.filter((group) => group.items === null).map((group) => group.connection) : [],
      loading: connections.isPending || results.loading,
      error: connections.error,
      reload: () => {
        void connections.refetch()
        results.reload()
      },
    }
  }, [list, results, connections])
}

export function hasPublishedContext(connection: Connection): boolean {
  return Boolean(connection.published)
}

export function newestFirst(sessions: AdkSessionSummary[]): AdkSessionSummary[] {
  return [...sessions].sort((a, b) => (b.lastUpdateTime ?? 0) - (a.lastUpdateTime ?? 0))
}

const LAST_CONNECTION_KEY = 'elze.agent.lastConnection'

export function rememberedConnection(): string | null {
  try {
    return window.localStorage.getItem(LAST_CONNECTION_KEY)
  } catch {
    return null
  }
}

export function rememberConnection(connectionId: string): void {
  try {
    window.localStorage.setItem(LAST_CONNECTION_KEY, connectionId)
  } catch {
    return
  }
}

export function defaultConnectionId(connections: Connection[] | null, preferred: string | null): string | null {
  const usable = (connections ?? []).filter((c) => c.status === 'connected')
  if (preferred && usable.some((c) => c.id === preferred)) return preferred
  const remembered = rememberedConnection()
  if (remembered && usable.some((c) => c.id === remembered)) return remembered
  return usable[0]?.id ?? null
}
