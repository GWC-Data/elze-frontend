import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { labelFor } from '@/lib/factFields'

export function FieldValue({ value, mono = false }: { value: unknown; mono?: boolean }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">—</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">none</span>
    return (
      <span className="flex flex-wrap gap-x-2 gap-y-0.5">
        {value.map((entry, i) => (
          <span
            key={i}
            className="font-mono text-[11px] leading-5"
          >
            {entry !== null && typeof entry === 'object' ? inlineObject(entry as Record<string, unknown>) : String(entry)}
          </span>
        ))}
      </span>
    )
  }
  if (typeof value === 'object') {
    return (
      <span className="font-mono text-[11px]">{inlineObject(value as Record<string, unknown>)}</span>
    )
  }
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>
  return <span className={cn('whitespace-pre-wrap break-words', mono && 'font-mono text-xs')}>{String(value)}</span>
}

function inlineObject(obj: Record<string, unknown>): ReactNode {
  const entries = Object.entries(obj)
  if (entries.length === 2 && 'column' in obj && 'references' in obj) {
    return `${String(obj.column)} → ${String(obj.references)}`
  }
  if (entries.length === 2 && 'name' in obj && 'type' in obj) {
    return `${String(obj.name)} (${String(obj.type)})`
  }
  return entries.map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(' · ')
}

export function FieldList({
  payload,
  omit = [],
  className,
}: {
  payload: Record<string, unknown>
  omit?: string[]
  className?: string
}) {
  const skip = new Set(omit)
  const entries = Object.entries(payload).filter(([key]) => !skip.has(key))
  if (entries.length === 0) return null
  return (
    <dl className={cn('grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)]', className)}>
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-muted-foreground">{labelFor(key)}</dt>
          <dd className="min-w-0">
            <FieldValue value={value} />
          </dd>
        </div>
      ))}
    </dl>
  )
}
