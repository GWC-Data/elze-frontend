import { useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Mail } from 'lucide-react'
import { errorMessage } from '@/api/client'
import { createUser as createPlatformUser } from '@/api/platform.api'
import { createTeamMember } from '@/api/workspace.api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormError, FormNotice, TextField } from '@/components/common/Fields'
import { RoleSelect } from '@/components/common/RoleSelect'
import { CompanyRoleSelect } from '@/components/common/roles/CompanyRoleSelect'
import { ROLE_LABELS } from '@/constants/labels'
import { ReviewRow, Stepper } from '@/components/common/onboarding/Stepper'
import { notify } from '@/lib/notify'
import type { AdminUser, CompanyOption } from '@/types/admin'
import type { RoleName } from '@/types/auth'

const STEPS = ['Person', 'Access', 'Review']

export function UserOnboardingDialog({
  open,
  onOpenChange,
  onCreated,
  companies,
  fixedCompanyName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (user: AdminUser) => void
  companies?: CompanyOption[]
  fixedCompanyName?: string | null
}) {
  const platformMode = Array.isArray(companies)

  const [step, setStep] = useState(1)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<RoleName>('USER')
  const [companyId, setCompanyId] = useState<number | null>(null)
  // One of the company's own roles for a member; null = the built-in Member role.
  const [customRoleId, setCustomRoleId] = useState<number | null>(null)

  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<AdminUser | null>(null)

  const reset = () => {
    setStep(1)
    setUsername('')
    setEmail('')
    setDisplayName('')
    setRole('USER')
    setCompanyId(null)
    setCustomRoleId(null)
    setError(null)
    setCreated(null)
    setPending(false)
  }

  const close = () => {
    onOpenChange(false)
    setTimeout(reset, 200)
  }

  const submitStep = (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setStep((current) => current + 1)
  }

  const selectedCompany = companies?.find((company) => company.id === companyId) ?? null

  const create = async () => {
    setPending(true)
    setError(null)
    try {
      const payload = {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        displayName: displayName.trim() || undefined,
        role,
        customRoleId: role === 'USER' ? customRoleId : undefined,
      }

      const user = platformMode
        ? await createPlatformUser({ ...payload, companyId: companyId ?? undefined })
        : await createTeamMember(payload)

      setCreated(user)
      onCreated(user)
      setStep(4)
      notify.success(`${user.username} has been invited.`, `An activation link was sent to ${user.email}.`)
    } catch (err) {
      setError(errorMessage(err, 'Unable to create the account.'))
      setPending(false)
    }
  }

  const personReady = username.trim().length > 0 && email.trim().length > 0
  const accessReady = !platformMode || role === 'SUPER_ADMIN' || companyId !== null

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-lg">
        {step < 4 ? (
          <>
            <DialogHeader>
              <DialogTitle>Add a person</DialogTitle>
              <DialogDescription>
                They receive an email with a link to set their own password.
              </DialogDescription>
            </DialogHeader>

            <Stepper steps={STEPS} current={step} />

            {error && <FormError message={error} />}

            {step === 1 && (
              <form onSubmit={submitStep} className="space-y-4" noValidate>
                <TextField
                  label="Username"
                  value={username}
                  onChange={setUsername}
                  placeholder="jordan.reed"
                  autoFocus
                  required
                />
                <TextField
                  label="Work email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  hint="The invitation goes here."
                  required
                />
                <TextField
                  label="Full name"
                  value={displayName}
                  onChange={setDisplayName}
                  placeholder="Optional"
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={close}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!personReady}>
                    Continue
                    <ChevronRight aria-hidden />
                  </Button>
                </DialogFooter>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={submitStep} className="space-y-4" noValidate>
                {platformMode && role !== 'SUPER_ADMIN' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="onboarding-company" className="text-xs font-medium">
                      Company
                    </Label>
                    <Select
                      value={companyId === null ? '' : String(companyId)}
                      onValueChange={(value) => {
                        setCompanyId(Number(value))
                        setCustomRoleId(null)
                      }}
                    >
                      <SelectTrigger id="onboarding-company" className="w-full">
                        <SelectValue placeholder="Choose a company" />
                      </SelectTrigger>
                      <SelectContent>
                        {(companies ?? [])
                          .filter((company) => company.active)
                          .map((company) => (
                            <SelectItem key={company.id} value={String(company.id)}>
                              {company.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Suspended companies are not listed: accounts cannot be added to them.
                    </p>
                  </div>
                )}

                <RoleSelect value={role} onChange={setRole} includePlatform={platformMode} />

                {role === 'USER' && (!platformMode || companyId !== null) ? (
                  <CompanyRoleSelect
                    companyId={platformMode ? companyId : null}
                    value={customRoleId}
                    onChange={setCustomRoleId}
                  />
                ) : null}

                <FormNotice message="Dashboard access is granted separately, after the account exists. A new person starts with none." />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    <ChevronLeft aria-hidden />
                    Back
                  </Button>
                  <Button type="submit" disabled={!accessReady}>
                    Continue
                    <ChevronRight aria-hidden />
                  </Button>
                </DialogFooter>
              </form>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/40 px-4 py-2">
                  <dl className="divide-y divide-border">
                    <ReviewRow label="Username" value={username} />
                    <ReviewRow label="Invitation to" value={email} />
                    {displayName && <ReviewRow label="Full name" value={displayName} />}
                    <ReviewRow label="Role" value={ROLE_LABELS[role]} />
                    <ReviewRow
                      label="Company"
                      value={
                        role === 'SUPER_ADMIN'
                          ? 'Platform (no company)'
                          : platformMode
                            ? (selectedCompany?.name ?? '—')
                            : (fixedCompanyName ?? 'Your company')
                      }
                    />
                  </dl>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    disabled={pending}
                  >
                    <ChevronLeft aria-hidden />
                    Back
                  </Button>
                  <Button type="button" onClick={() => void create()} disabled={pending}>
                    {pending ? (
                      <>
                        <Loader2 className="animate-spin" aria-hidden />
                        Creating and inviting…
                      </>
                    ) : (
                      <>
                        <Mail aria-hidden />
                        Create and invite
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </>
        ) : (
          created && (
            <>
              <DialogHeader>
                <DialogTitle className="sr-only">Person invited</DialogTitle>
                <DialogDescription className="sr-only">
                  {created.username} was created and invited by email.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 text-center">
                <div className="mx-auto grid size-12 place-items-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 className="size-6" aria-hidden />
                </div>
                <p className="mt-4 text-base font-semibold text-foreground">
                  {created.username} has been invited
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  An activation link was sent to
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">{created.email}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  They choose their own password from that link. The account shows as Invited until
                  they do.
                </p>
              </div>

              <DialogFooter>
                <Button onClick={close} className="w-full">
                  Done
                </Button>
              </DialogFooter>
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  )
}
