import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2, Pencil, Plus, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import {
  createCompanyRole,
  deleteCompanyRole,
  listCompanyRoles,
  listRolePermissionOptions,
  resetBuiltInRole,
  saveBuiltInRole,
  updateCompanyRole,
} from '@/api/companyRoles.api'
import { errorMessage } from '@/api/client'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/authContext'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormError, TextField } from '@/components/common/Fields'
import { EmptyState, ErrorState, InlineLoading } from '@/components/common/States'
import { PermissionGrid } from '@/components/common/roles/PermissionGrid'
import { FEATURE_LABELS } from '@/constants/features'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { BuiltInCompanyRole, CompanyRole, RolePermissionOption } from '@/types/admin'

export default function CompanyRolesPage() {
  const { can, user } = useAuth()
  const roles = useAsync(() => listCompanyRoles(), [])
  const options = useAsync(() => listRolePermissionOptions(), [])

  const [editing, setEditing] = useState<CompanyRole | 'new' | null>(null)
  const [editingBuiltIn, setEditingBuiltIn] = useState<BuiltInCompanyRole | null>(null)
  const [resetting, setResetting] = useState<BuiltInCompanyRole | null>(null)
  const [resetPending, setResetPending] = useState(false)
  const [viewing, setViewing] = useState<{ name: string; permissions: string[] } | null>(null)
  const [deleting, setDeleting] = useState<CompanyRole | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const permissionOptions = options.data?.permissions ?? []
  const enabledFeatures = roles.data?.features ?? []

  const remove = async () => {
    if (!deleting) return
    setDeletePending(true)
    try {
      await deleteCompanyRole(deleting.id)
      notify.success(`Role “${deleting.name}” deleted.`)
      setDeleting(null)
      roles.reload()
    } catch (err) {
      notify.failure('delete that role', err)
    } finally {
      setDeletePending(false)
    }
  }

  const reset = async () => {
    if (!resetting) return
    setResetPending(true)
    try {
      await resetBuiltInRole(resetting.name)
      notify.success(`${resetting.label} is back to the platform defaults.`)
      setResetting(null)
      roles.reload()
    } catch (err) {
      notify.failure('reset that role', err)
    } finally {
      setResetPending(false)
    }
  }

  const labelFor = (id: string) => permissionOptions.find((p) => p.id === id)?.label ?? id

  return (
    <Page>
      <PageHeader
        title="Roles"
        icon={<ShieldCheck className="mt-1 size-5 text-muted-foreground" aria-hidden />}
        description={
          <>
            Every member holds one role and gets exactly its permissions.{' '}
            {user?.companyName ? `${user.companyName} has: ` : 'Your company has: '}
            {enabledFeatures.map((f) => FEATURE_LABELS[f] ?? f).join(', ') || '—'}.
          </>
        }
        actions={
          can('role.create') ? (
            <Button onClick={() => setEditing('new')} disabled={!options.data}>
              <Plus aria-hidden />
              New role
            </Button>
          ) : undefined
        }
      />

      {roles.error ? (
        <Section>
          <ErrorState error={roles.error} title="Unable to load the roles" onRetry={roles.reload} />
        </Section>
      ) : roles.loading || !roles.data ? (
        <Section>
          <InlineLoading label="Loading roles…" />
        </Section>
      ) : (
        <>
          <Section
            title="Built-in roles"
            description="Your company’s own Member role follows the platform owner’s defaults until you change it; your changes apply to your company only. Company admin cannot be changed here."
            flush
          >
            <ul className="divide-y divide-border">
              {roles.data.builtIn.map((role) => (
                <li key={role.name} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {role.label}
                      {role.customized ? (
                        <span className="ml-2 text-xs font-normal text-primary">
                          Customised for your company
                          {role.modifiedBy || role.modifiedAt ? (
                            <span className="text-muted-foreground">
                              {' '}
                              · {role.modifiedBy ? `by ${role.modifiedBy}` : ''}
                              {role.modifiedAt ? ` ${new Date(role.modifiedAt).toLocaleDateString()}` : ''}
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'} ·{' '}
                      {role.userCount} member{role.userCount === 1 ? '' : 's'}
                      {role.name === 'COMPANY_ADMIN' ? ' · set by the platform owner' : ''}
                    </span>
                  </span>
                  {role.editable ? (
                    <>
                      {role.customized ? (
                        <Button size="sm" variant="ghost" onClick={() => setResetting(role)}>
                          <RotateCcw aria-hidden />
                          Reset to default
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!options.data}
                        onClick={() => setEditingBuiltIn(role)}
                      >
                        <Pencil aria-hidden />
                        Edit permissions
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!options.data}
                      onClick={() => setViewing({ name: role.label, permissions: role.permissions })}
                    >
                      View permissions
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Your company’s roles" description="Give a member one of these instead of the built-in Member role." flush>
            {roles.data.custom.length === 0 ? (
              <EmptyState
                title="No custom roles yet"
                body="Create a role such as “Analyst” or “Viewer” with exactly the permissions it needs, then give it to members from the Members page."
                icon={ShieldCheck}
                action={
                  can('role.create') ? (
                    <Button onClick={() => setEditing('new')} disabled={!options.data}>
                      <Plus aria-hidden />
                      New role
                    </Button>
                  ) : undefined
                }
                compact
              />
            ) : (
              <ul className="divide-y divide-border">
                {roles.data.custom.map((role) => (
                  <li key={role.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{role.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {role.description ? `${role.description} · ` : ''}
                        {role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'} ·{' '}
                        {role.userCount} member{role.userCount === 1 ? '' : 's'}
                      </span>
                      {role.permissions.length ? (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {role.permissions.slice(0, 6).map(labelFor).join(', ')}
                          {role.permissions.length > 6 ? ` +${role.permissions.length - 6} more` : ''}
                        </span>
                      ) : null}
                    </span>
                    {can('role.edit') ? (
                      <Button size="sm" variant="outline" disabled={!options.data} onClick={() => setEditing(role)}>
                        <Pencil aria-hidden />
                        Edit
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!options.data}
                        onClick={() => setViewing({ name: role.name, permissions: role.permissions })}
                      >
                        View permissions
                      </Button>
                    )}
                    {can('role.delete') ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${role.name}`}
                        onClick={() => setDeleting(role)}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}

      {editing !== null && options.data ? (
        <RoleEditorDialog
          role={editing === 'new' ? null : editing}
          options={permissionOptions}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            roles.reload()
          }}
        />
      ) : null}

      {editingBuiltIn && options.data ? (
        <RoleEditorDialog
          role={null}
          builtIn={editingBuiltIn}
          options={permissionOptions}
          onClose={() => setEditingBuiltIn(null)}
          onSaved={() => {
            setEditingBuiltIn(null)
            roles.reload()
          }}
        />
      ) : null}

      <ConfirmDialog
        open={resetting !== null}
        onOpenChange={(open) => !open && setResetting(null)}
        title={`Reset ${resetting?.label ?? 'this role'} to the platform defaults?`}
        body="Your company’s changes to this role are discarded, and its members get the platform owner’s default permissions from their next action."
        confirmLabel="Reset"
        pending={resetPending}
        onConfirm={() => void reset()}
      />

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-3xl">
          <DialogHeader className="shrink-0">
            <DialogTitle>{viewing?.name}</DialogTitle>
            <DialogDescription>What members holding this role can do.</DialogDescription>
          </DialogHeader>
          {viewing ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PermissionGrid options={permissionOptions} selected={new Set(viewing.permissions)} readOnly />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete the role “${deleting?.name ?? ''}”?`}
        body={
          deleting && deleting.userCount > 0
            ? `${deleting.userCount} member${deleting.userCount === 1 ? ' holds' : 's hold'} it. Give them another role first.`
            : 'Nobody holds this role. It is removed for good.'
        }
        confirmLabel="Delete role"
        destructive
        pending={deletePending}
        onConfirm={() => void remove()}
      />
    </Page>
  )
}

function RoleEditorDialog({
  role,
  builtIn,
  options,
  onClose,
  onSaved,
}: {
  role: CompanyRole | null
  builtIn?: BuiltInCompanyRole
  options: RolePermissionOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [selected, setSelected] = useState<Set<string>>(
    new Set(builtIn ? builtIn.permissions : role?.permissions ?? [])
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError(null)
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      permissions: [...selected],
    }
    try {
      if (builtIn) {
        await saveBuiltInRole(builtIn.name, body.permissions)
        notify.success(
          `${builtIn.label} permissions saved for your company.`,
          builtIn.userCount ? `Its ${builtIn.userCount} member(s) have the change from their next action.` : undefined
        )
        onSaved()
        return
      }
      if (role) await updateCompanyRole(role.id, body)
      else await createCompanyRole(body)
      notify.success(
        role ? `Role “${body.name}” saved.` : `Role “${body.name}” created.`,
        role && role.userCount ? `Its ${role.userCount} member(s) have the change from their next action.` : undefined
      )
      onSaved()
    } catch (err) {
      setError(errorMessage(err, 'Unable to save the role.'))
      setPending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-3xl">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-4" noValidate>
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {builtIn ? `Edit ${builtIn.label} permissions` : role ? `Edit ${role.name}` : 'New role'}
            </DialogTitle>
            <DialogDescription>
              {builtIn
                ? 'What every member without a company role of their own may do, in your company only. You can reset it to the platform defaults at any time.'
                : 'Tick what members with this role may do.'}{' '}
              Create, Edit and Delete include View. Managing members, groups and roles stays with
              the company admin.
            </DialogDescription>
          </DialogHeader>

          {error ? <FormError message={error} /> : null}

          {builtIn ? null : (
            <div className="grid shrink-0 gap-4 sm:grid-cols-2">
              <TextField label="Name" value={name} onChange={setName} placeholder="Analyst" required autoFocus />
              <TextField
                label="Description"
                value={description}
                onChange={setDescription}
                placeholder="Optional"
              />
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            <PermissionGrid options={options} selected={selected} onChange={setSelected} />
          </div>

          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || (!builtIn && name.trim().length < 2)}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {builtIn || role ? 'Save role' : 'Create role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
