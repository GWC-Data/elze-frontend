import { useState } from 'react'
import { fetchCompanyFeatures, saveCompanyFeatures } from '@/api/platform.api'
import { useAsync } from '@/hooks/useAsync'
import { Section } from '@/components/common/Page'
import { ErrorState, InlineLoading } from '@/components/common/States'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FeatureToggles } from '@/components/common/features/FeatureToggles'
import { notify } from '@/lib/notify'
import type { CompanyFeature, FeatureId } from '@/types/admin'

// The platform owner's switches for one company. Works whether the company is active or
// deactivated. Each switch saves at once - the backend takes the whole set, so the set
// sent is "what is on after this change". Turning one off is confirmed first: the company's
// members lose it on their next request (nothing is deleted, and turning it back on
// restores every role exactly as it was).
export function CompanyFeaturesSection({
  companyId,
  companyName,
  editable,
  onChanged,
}: {
  companyId: number
  companyName: string
  editable: boolean
  onChanged?: () => void
}) {
  const state = useAsync(() => fetchCompanyFeatures(companyId), [companyId])
  const [saved, setSaved] = useState<CompanyFeature[] | null>(null)
  const [busyId, setBusyId] = useState<FeatureId | null>(null)
  const [confirmOff, setConfirmOff] = useState<CompanyFeature | null>(null)

  const features = saved ?? state.data?.features ?? null

  const apply = async (id: FeatureId, on: boolean) => {
    if (!features) return
    const next = features
      .filter((f) => !f.locked && (f.id === id ? on : f.enabled))
      .map((f) => f.id)
    setBusyId(id)
    try {
      const result = await saveCompanyFeatures(companyId, next)
      setSaved(result.features)
      const label = features.find((f) => f.id === id)?.label ?? id
      notify.success(on ? `${label} is on for ${companyName}.` : `${label} is off for ${companyName}.`)
      onChanged?.()
    } catch (err) {
      notify.failure('change that feature', err)
    } finally {
      setBusyId(null)
      setConfirmOff(null)
    }
  }

  const onToggle = (id: FeatureId, on: boolean) => {
    if (on) return void apply(id, true)
    setConfirmOff(features?.find((f) => f.id === id) ?? null)
  }

  return (
    <Section
      title="Features"
      description={`What ${companyName} can use. Its roles can only hold permissions of the features switched on here.`}
    >
      {state.error && !features ? (
        <ErrorState error={state.error} onRetry={state.reload} compact />
      ) : !features ? (
        <InlineLoading label="Loading features…" />
      ) : (
        <FeatureToggles
          features={features}
          enabled={new Set(features.filter((f) => f.enabled).map((f) => f.id))}
          onToggle={onToggle}
          disabled={!editable}
          busyId={busyId}
        />
      )}
      {!editable ? (
        <p className="mt-2 text-xs text-muted-foreground">Your role can see these but not change them.</p>
      ) : null}

      <ConfirmDialog
        open={confirmOff !== null}
        onOpenChange={(open) => !open && setConfirmOff(null)}
        title={`Turn off ${confirmOff?.label ?? 'this feature'} for ${companyName}?`}
        body={`${confirmOff?.covers.join(', ') ?? 'It'} disappears for everyone at ${companyName}, and their requests to it are refused from now on.`}
        consequence="Nothing is deleted. Turning it back on restores every role exactly as it was."
        confirmLabel="Turn off"
        destructive
        pending={busyId !== null}
        onConfirm={() => confirmOff && void apply(confirmOff.id, false)}
      />
    </Section>
  )
}
