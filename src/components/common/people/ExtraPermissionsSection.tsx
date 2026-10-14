import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { Section } from '@/components/common/Page'
import { ErrorState, InlineLoading } from '@/components/common/States'
import { PermissionGrid } from '@/components/common/roles/PermissionGrid'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/button'
import type { UserPermissions } from '@/types/admin'

const TITLE = 'Extra permissions'

export function ExtraPermissionsSection({
  reloadKey,
  load,
  save,
}: {
  reloadKey: string
  load: () => Promise<UserPermissions>
  save: (permissionIds: string[]) => Promise<UserPermissions>
}) {
  const state = useAsync(load, [reloadKey])
  const [saved, setSaved] = useState<UserPermissions | null>(null)
  const [edited, setEdited] = useState<Set<string> | null>(null)
  const [pending, setPending] = useState(false)

  const data = saved ?? state.data

  if (state.error && !data) {
    return (
      <Section title={TITLE}>
        <ErrorState error={state.error} onRetry={state.reload} compact />
      </Section>
    )
  }
  if (!data) {
    return (
      <Section title={TITLE}>
        <InlineLoading label="Loading permissions…" />
      </Section>
    )
  }
  if (!data.options.length) return null

  const fromRole = new Set(data.rolePermissionIds)
  const options = data.options.filter((option) => !fromRole.has(option.id))
  const current = new Set(data.extraPermissionIds)
  const selected = edited ?? current
  const dirty = edited !== null && (edited.size !== current.size || [...edited].some((id) => !current.has(id)))

  const submit = async () => {
    setPending(true)
    try {
      setSaved(await save([...selected]))
      setEdited(null)
      notify.success('Extra permissions saved.', 'They apply from this person’s next action.')
    } catch (err) {
      notify.failure('save these permissions', err)
    } finally {
      setPending(false)
    }
  }

  return (
    <Section
      title={TITLE}
      description={`Given to this person only, on top of the ${data.role.name ?? 'role'} role (${fromRole.size} permissions).`}
      actions={
        data.editable ? (
          <Button size="sm" onClick={() => void submit()} disabled={pending || !dirty}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Save extra permissions
          </Button>
        ) : undefined
      }
    >
      {options.length ? (
        <PermissionGrid
          options={options}
          selected={selected}
          onChange={setEdited}
          readOnly={!data.editable || pending}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Their role already gives every permission that can be added here.
        </p>
      )}
    </Section>
  )
}
