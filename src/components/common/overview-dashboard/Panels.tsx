import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Section } from '@/components/common/Page'
import { cn } from '@/lib/utils'

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{children}</div>
}

export function PanelGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 lg:grid-cols-2 [&>section]:mt-0">{children}</div>
}

export function Panel({
  title,
  description,
  to,
  linkLabel = 'View all',
  children,
}: {
  title: string
  description?: string
  to?: string
  linkLabel?: string
  children: ReactNode
}) {
  return (
    <Section
      title={title}
      description={description}
      actions={
        to ? (
          <Link to={to} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            {linkLabel}
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        ) : undefined
      }
      bodyClassName="p-0"
    >
      {children}
    </Section>
  )
}

export function PanelList({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-border">{children}</ul>
}

export function PanelRow({
  icon: Icon,
  title,
  meta,
  to,
  tone = 'neutral',
}: {
  icon?: ComponentType<{ className?: string }>
  title: ReactNode
  meta?: ReactNode
  to?: string
  tone?: 'neutral' | 'warning' | 'danger' | 'success'
}) {
  const toneClass = {
    neutral: 'bg-muted text-muted-foreground',
    warning: 'bg-warning/15 text-warning-foreground',
    danger: 'bg-destructive/10 text-destructive',
    success: 'bg-success/10 text-success',
  }[tone]

  const body = (
    <div className="flex items-center gap-3 px-5 py-3">
      {Icon && (
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', toneClass)}>
          <Icon className="size-4" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {meta && <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>}
      </div>
      {to && <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
    </div>
  )

  return (
    <li>
      {to ? (
        <Link to={to} className="block transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  )
}

export function PanelEmpty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-6 text-sm text-muted-foreground">{children}</p>
}

export function PanelLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 px-5 py-4" aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  )
}

export interface AttentionItem {
  key: string
  title: ReactNode
  meta?: ReactNode
  to?: string
  tone?: 'warning' | 'danger'
}

/** "Needs attention": warnings when there are some, an all-clear line otherwise. */
export function AttentionPanel({ items, loading }: { items: AttentionItem[]; loading?: boolean }) {
  return (
    <Panel title="Needs attention" description="Things waiting on someone">
      {loading ? (
        <PanelLoading />
      ) : items.length === 0 ? (
        <div className="flex items-center gap-2 px-5 py-6 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-success" aria-hidden />
          Nothing needs attention right now.
        </div>
      ) : (
        <PanelList>
          {items.map((item) => (
            <PanelRow
              key={item.key}
              icon={AlertTriangle}
              tone={item.tone ?? 'warning'}
              title={item.title}
              meta={item.meta}
              to={item.to}
            />
          ))}
        </PanelList>
      )}
    </Panel>
  )
}

export interface QuickAction {
  label: string
  to: string
  icon: ComponentType<{ className?: string }>
}

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  if (!actions.length) return null
  return (
    <Section title="Quick actions">
      <div className="flex flex-wrap gap-2">
        {actions.map(({ label, to, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent/40"
          >
            <Icon className="size-4 text-muted-foreground" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </Section>
  )
}
