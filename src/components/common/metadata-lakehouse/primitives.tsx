import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { EMPTY, formatConfidence } from '@/lib/format'

export function StatTile({
  label,
  value,
  hint,
  icon,
  onClick,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  onClick?: () => void
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'rounded-xl border bg-card px-5 py-4 text-left shadow-xs',
        onClick && 'transition-colors hover:border-primary/40 hover:bg-accent/40'
      )}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <Eyebrow className="truncate">{label}</Eyebrow>
      </div>
      <p className="mt-2 font-serif text-3xl font-semibold tabular-nums leading-none tracking-tight">{value}</p>
      {hint ? <p className="mt-1.5 truncate font-serif text-sm italic text-muted-foreground">{hint}</p> : null}
    </Wrapper>
  )
}

export function ConfidenceMeter({
  value,
  className,
  showLabel = true,
}: {
  value: number | null | undefined
  className?: string
  showLabel?: boolean
}) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className="text-xs text-muted-foreground">{EMPTY}</span>
  }
  const ratio = Math.max(0, Math.min(1, value > 1 ? value / 100 : value))
  const band = ratio >= 0.9 ? 'high' : ratio >= 0.7 ? 'medium' : 'low'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Confidence"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width]',
            band === 'high' && 'bg-primary',
            band === 'medium' && 'bg-primary/60',
            band === 'low' && 'bg-primary/30'
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      {showLabel ? (
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatConfidence(value)}
        </span>
      ) : null}
    </div>
  )
}

export function AiBadge({ label = 'AI suggested' }: { label?: string }) {
  return (
    <Badge
      variant="outline"
      className="border-dashed italic text-muted-foreground"
    >
      {label}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-xs text-muted-foreground">{EMPTY}</span>

  const value = status.toLowerCase()
  const tone =
    value === 'connected' || value === 'approved' || value === 'accepted' || value === 'ready' || value === 'published'
      ? 'ok'
      : value === 'invalid' || value === 'rejected' || value === 'failed' || value === 'error'
        ? 'bad'
        : value === 'generating' || value === 'pending' || value === 'suggested'
          ? 'busy'
          : 'neutral'

  return (
    <Badge
      variant="outline"
      className={cn(
        'capitalize',
        tone === 'ok' && 'border-primary/30 bg-primary/10 font-semibold text-primary',
        tone === 'bad' && 'border-destructive/30 bg-destructive/10 text-destructive',
        tone === 'busy' && 'border-dashed italic text-muted-foreground'
      )}
    >
      {status}
    </Badge>
  )
}

export function Cell({ value }: { value: ReactNode }) {
  const absent = value === null || value === undefined || value === '' || value === EMPTY
  return (
    <span className={cn('tabular-nums', absent && 'text-muted-foreground')}>
      {absent ? EMPTY : value}
    </span>
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-[11px] font-semibold uppercase tracking-[0.14em] text-primary', className)}>
      {children}
    </p>
  )
}

export function Headline({
  children,
  className,
  as: Tag = 'h3',
}: {
  children: ReactNode
  className?: string
  as?: 'h2' | 'h3' | 'h4'
}) {
  return (
    <Tag className={cn('font-serif text-xl font-semibold leading-snug tracking-tight text-foreground', className)}>
      {children}
    </Tag>
  )
}

export function Lede({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('max-w-[72ch] font-serif text-[15.5px] leading-7 text-foreground/85', className)}>
      {children}
    </p>
  )
}

export function MetaLine({ items, className }: { items: ReactNode[]; className?: string }) {
  const shown = items.filter((item) => item !== null && item !== undefined && item !== false && item !== '')
  return (
    <p className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground', className)}>
      {shown.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {i > 0 ? <span aria-hidden className="text-muted-foreground/50">·</span> : null}
          {item}
        </span>
      ))}
    </p>
  )
}

export function SectionHeading({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 className="font-serif text-lg font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions}
    </div>
  )
}
