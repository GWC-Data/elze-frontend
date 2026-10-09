import { Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { FeatureDef, FeatureId } from '@/types/admin'

export function FeatureToggles({
  features,
  enabled,
  onToggle,
  disabled = false,
  busyId = null,
}: {
  features: FeatureDef[]
  enabled: ReadonlySet<FeatureId>
  onToggle: (id: FeatureId, on: boolean) => void
  disabled?: boolean
  busyId?: FeatureId | null
}) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {features.map((feature) => {
        const on = feature.locked || enabled.has(feature.id)
        const inputId = `feature-${feature.id}`
        return (
          <li key={feature.id} className="flex items-start gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <label htmlFor={inputId} className="text-sm font-medium text-foreground">
                {feature.label}
              </label>
              <p className="mt-0.5 text-xs text-muted-foreground">{feature.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sidebar: {feature.covers.join(', ')}
                {feature.locked ? (
                  <span className="ml-1.5 font-medium text-primary">· Always included</span>
                ) : null}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              {busyId === feature.id ? (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden />
              ) : null}
              <Switch
                id={inputId}
                checked={on}
                disabled={disabled || feature.locked || busyId !== null}
                onCheckedChange={(next) => onToggle(feature.id, next === true)}
                aria-label={`${feature.label}: ${on ? 'on' : 'off'}`}
                className={cn(feature.locked && 'data-disabled:opacity-70')}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
