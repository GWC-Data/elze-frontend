import { CheckCircle2, PencilLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContextVersionStatus } from '@/types/metadataLakehouse'

export function VersionBadge({
  status,
  label,
  className,
}: {
  status: ContextVersionStatus
  label: string
  className?: string
}) {
  const draft = status === 'draft'
  const Icon = draft ? PencilLine : CheckCircle2
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-semibold',
        draft
          ? 'text-amber-700 dark:text-amber-300'
          : 'text-emerald-700 dark:text-emerald-300',
        className
      )}
    >
      <Icon className="size-3" aria-hidden />
      {draft ? 'Draft' : 'Published'} · {label}
    </span>
  )
}
