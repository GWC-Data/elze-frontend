import { useState } from 'react'
import { notify } from '@/lib/notify'
import { StepFrame } from '@/components/common/metadata-lakehouse/StepFrame'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { NoConnectionState } from '@/components/common/metadata-lakehouse/DataStates'
import { useContextProfile, useSaveContextProfile } from '@/hooks/useMetadataLakehouse'
import { useWorkflow } from '@/context/workflowContext'

export function ContextStep() {
  const { connectionId, goToStep, readOnly } = useWorkflow()
  const profile = useContextProfile(connectionId)
  const save = useSaveContextProfile(connectionId)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loadedFor, setLoadedFor] = useState<string | null>(null)

  // Seed the form once per connection, as soon as its profile query resolves
  // (data is null when none is saved yet) — adjusted during render rather than
  // in an effect, so it never clobbers what the user is mid-typing afterwards.
  if (profile.isSuccess && loadedFor !== connectionId) {
    setLoadedFor(connectionId)
    setName(profile.data?.name ?? '')
    setDescription(profile.data?.description ?? '')
  }

  if (!connectionId) {
    return (
      <StepFrame title="Context" hideNext>
        <NoConnectionState onConnect={() => goToStep('connect')} />
      </StepFrame>
    )
  }

  const trimmedName = name.trim()

  return (
    <StepFrame
      title="Context"
      description="Name this context and describe what it's for, before picking datasets."
      nextDisabled={!trimmedName}
      onNext={async () => {
        if (readOnly) return
        if (!trimmedName) {
          notify.error('Give this context a name.')
          return false
        }
        try {
          await save.mutateAsync({ name: trimmedName, description: description.trim() })
        } catch (err) {
          notify.failure('save the context name and description', err)
          return false
        }
      }}
      footerNote={!trimmedName ? 'A context name is required to continue.' : undefined}
    >
      <div className="max-w-xl space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="context-name">Context name</Label>
          <Input
            id="context-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sales warehouse"
            maxLength={120}
            disabled={readOnly}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="context-description">Description</Label>
          <Textarea
            id="context-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this context covers and who it's for."
            rows={4}
            maxLength={2000}
            disabled={readOnly}
          />
        </div>
      </div>
    </StepFrame>
  )
}
