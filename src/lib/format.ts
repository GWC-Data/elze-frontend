export const EMPTY = '—'

const COMPACT = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return EMPTY
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const exponent = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  const digits = exponent === 0 ? 0 : value >= 100 ? 0 : 1
  return `${value.toFixed(digits)} ${units[exponent]}`
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY
  return Math.abs(value) >= 10_000 ? COMPACT.format(value) : value.toLocaleString('en-US')
}

export function formatExact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY
  return value.toLocaleString('en-US')
}

export function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY
  const ratio = value > 1 ? value / 100 : value
  return `${Math.round(ratio * 100)}%`
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY
  const rounded = Math.round(value * 10) / 10
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}%`
}

export function formatRelativeTime(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return EMPTY

  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  const ms = date.getTime()
  if (!Number.isFinite(ms)) return EMPTY

  const seconds = Math.round((Date.now() - ms) / 1000)
  if (seconds < 0) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (seconds < 60) return 'just now'

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`

  const days = Math.round(hours / 24)
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}

export function formatDateTime(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return EMPTY
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return EMPTY
  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatText(value: string | null | undefined): string {
  return value === null || value === undefined || value === '' ? EMPTY : value
}

export function maskSecretHint(hint: string | null | undefined): string {
  if (!hint) return EMPTY
  return `••••${hint.slice(-4)}`
}

export function formatPlaybookRunTimestamp(lastRun: string) {
  const date = new Date(lastRun)
  return {
    date: date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    day: date.toLocaleDateString(undefined, { weekday: 'short' }),
    time: date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }),
  }
}
