import { useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import type { ListQuery, Paged } from '@/types/admin'

/** P is the page type, for endpoints whose page carries more than items and total. */
export function useServerList<T, F extends object = Record<string, never>, P extends Paged<T> = Paged<T>>(
  fetchPage: (query: ListQuery & F) => Promise<P>,
  initial: ListQuery,
  filters: F = {} as F
) {
  const [query, setQueryState] = useState<ListQuery>(initial)

  const filterKey = JSON.stringify(filters)
  const [seenFilterKey, setSeenFilterKey] = useState(filterKey)
  if (seenFilterKey !== filterKey) {
    setSeenFilterKey(filterKey)
    if (query.page !== 1) setQueryState({ ...query, page: 1 })
  }

  const request = { ...query, ...filters }
  const params = Object.fromEntries(
    Object.entries(request).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ) as ListQuery & F

  const state = useAsync(() => fetchPage(params), [JSON.stringify(params)])

  const [last, setLast] = useState<P | null>(null)
  if (state.data && state.data !== last) setLast(state.data)

  return {
    query,
    setQuery: setQueryState,
    data: state.data ?? (state.loading ? last : null),
    error: state.error,
    loading: state.loading && last === null,
    refreshing: state.loading && last !== null,
    reload: state.reload,
    narrowed:
      Boolean(query.search) ||
      Object.values(filters).some((v) => v !== undefined && v !== null && v !== ''),
  }
}
