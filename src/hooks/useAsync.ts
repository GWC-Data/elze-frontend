import { useCallback, useEffect, useRef, useState } from 'react'

export interface AsyncState<T> {
  data: T | null
  error: unknown
  loading: boolean
  reload: () => void
}

export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const loaderRef = useRef(loader)
  useEffect(() => {
    loaderRef.current = loader
  })

  const [token, setToken] = useState(0)

  const key = `${token}:${JSON.stringify(deps)}`

  const [settled, setSettled] = useState<{ key: string; data: T | null; error: unknown } | null>(
    null
  )

  useEffect(() => {
    let cancelled = false

    loaderRef
      .current()
      .then((data) => {
        if (!cancelled) setSettled({ key, data, error: null })
      })
      .catch((error: unknown) => {
        if (!cancelled) setSettled({ key, data: null, error })
      })

    return () => {
      cancelled = true
    }
  }, [key])

  const current = settled !== null && settled.key === key ? settled : null

  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: current === null,
    reload: useCallback(() => setToken((n) => n + 1), []),
  }
}
