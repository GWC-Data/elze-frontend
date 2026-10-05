import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Mail } from 'lucide-react'
import { createCompany, listFeatures } from '@/api/platform.api'
import { errorMessage } from '@/api/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormError, FormNotice, TextField } from '@/components/common/Fields'
import { CompanyAvatar } from '@/components/common/CompanyAvatar'
import { ReviewRow, Stepper } from '@/components/common/onboarding/Stepper'
import { FeatureToggles } from '@/components/common/features/FeatureToggles'
import { notify } from '@/lib/notify'
import type { Company, FeatureDef, FeatureId } from '@/types/admin'

const STEPS = ['Company', 'Features', 'Administrator', 'Review']
const DONE = STEPS.length + 1

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function CompanyOnboardingDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (company: Company) => void
}) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)

  const [adminUsername, setAdminUsername] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminDisplayName, setAdminDisplayName] = useState('')

  // Toggleable features start OFF: what a company gets is a decision, not a default.
  // Metadata Lakehouse is locked on and never sent.
  const [catalogue, setCatalogue] = useState<FeatureDef[] | null>(null)
  const [catalogueError, setCatalogueError] = useState<string | null>(null)
  const [features, setFeatures] = useState<Set<FeatureId>>(new Set())

  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<Company | null>(null)

  useEffect(() => {
    if (!open || catalogue) return
    let cancelled = false
    listFeatures()
      .then((list) => !cancelled && setCatalogue(list))
      .catch((err) => !cancelled && setCatalogueError(errorMessage(err, 'Unable to load the features.')))
    return () => {
      cancelled = true
    }
  }, [open, catalogue])

  const toggleFeature = (id: FeatureId, on: boolean) =>
    setFeatures((current) => {
      const next = new Set(current)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const reset = () => {
    setStep(1)
    setName('')
    setSlug('')
    setSlugEdited(false)
    setAdminUsername('')
    setAdminEmail('')
    setAdminDisplayName('')
    setFeatures(new Set())
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

  const create = async () => {
    setPending(true)
    setError(null)
    try {
      const company = await createCompany({
        name: name.trim(),
        slug: slug.trim() || undefined,
        features: [...features],
        admin: {
          username: adminUsername.trim(),
          email: adminEmail.trim().toLowerCase(),
          displayName: adminDisplayName.trim() || undefined,
        },
      })
      setCreated(company)
      onCreated(company)
      setStep(DONE)
      notify.success(`${company.name} is onboarded.`, 'The administrator has been invited by email.')
    } catch (err) {
      setError(errorMessage(err, 'Unable to onboard the company.'))
      setPending(false)
    }
  }

  const companyReady = name.trim().length >= 2 && slug.trim().length >= 3
  const adminReady = adminUsername.trim().length > 0 && adminEmail.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-lg">
        {step < DONE ? (
          <>
            <DialogHeader>
              <DialogTitle>Onboard a company</DialogTitle>
              <DialogDescription>
                Create the customer and invite the person who will administer it.
              </DialogDescription>
            </DialogHeader>

            <Stepper steps={STEPS} current={step} />

            {error && <FormError message={error} />}

            {step === 1 && (
              <form onSubmit={submitStep} className="space-y-4" noValidate>
                <TextField
                  label="Company name"
                  value={name}
                  onChange={(value) => {
                    setName(value)
                    if (!slugEdited) setSlug(slugify(value))
                  }}
                  placeholder="Acme Corporation"
                  autoFocus
                  required
                />
                <TextField
                  label="Identifier"
                  value={slug}
                  onChange={(value) => {
                    setSlug(value)
                    setSlugEdited(true)
                  }}
                  hint="Lowercase letters, digits and hyphens. Used in links and records; it cannot be changed later."
                  required
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={close}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!companyReady}>
                    Continue
                    <ChevronRight aria-hidden />
                  </Button>
                </DialogFooter>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={submitStep} className="space-y-4" noValidate>
                <p className="text-sm text-muted-foreground">
                  Choose what this company gets. Its roles can only use the features switched on
                  here, and you can change this at any time from the company page.
                </p>
                {catalogueError ? (
                  <FormError message={catalogueError} />
                ) : catalogue ? (
                  <FeatureToggles features={catalogue} enabled={features} onToggle={toggleFeature} />
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Loading features…
                  </p>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    <ChevronLeft aria-hidden />
                    Back
                  </Button>
                  <Button type="submit" disabled={!catalogue}>
                    Continue
                    <ChevronRight aria-hidden />
                  </Button>
                </DialogFooter>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={submitStep} className="space-y-4" noValidate>
                <TextField
                  label="Username"
                  value={adminUsername}
                  onChange={setAdminUsername}
                  placeholder="jordan.reed"
                  autoFocus
                  required
                />
                <TextField
                  label="Work email"
                  type="email"
                  value={adminEmail}
                  onChange={setAdminEmail}
                  autoComplete="email"
                  hint="The invitation goes here. Check it carefully."
                  required
                />
                <TextField
                  label="Full name"
                  value={adminDisplayName}
                  onChange={setAdminDisplayName}
                  placeholder="Optional"
                />

                <FormNotice message="This person will administer the company: they add its people and decide who sees which dashboards. You are not setting a password — they choose their own from the emailed link." />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    <ChevronLeft aria-hidden />
                    Back
                  </Button>
                  <Button type="submit" disabled={!adminReady}>
                    Continue
                    <ChevronRight aria-hidden />
                  </Button>
                </DialogFooter>
              </form>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/40 px-4 py-2">
                  <dl className="divide-y divide-border">
                    <ReviewRow
                      label="Company"
                      value={
                        <span className="flex items-center justify-end gap-2">
                          <CompanyAvatar name={name} size="xs" />
                          {name}
                        </span>
                      }
                    />
                    <ReviewRow label="Identifier" value={<code className="text-xs">{slug}</code>} />
                    <ReviewRow
                      label="Features"
                      value={
                        catalogue
                          ? catalogue
                              .filter((f) => f.locked || features.has(f.id))
                              .map((f) => f.label)
                              .join(', ')
                          : '—'
                      }
                    />
                    <ReviewRow label="Administrator" value={adminUsername} />
                    <ReviewRow label="Invitation to" value={adminEmail} />
                    {adminDisplayName && (
                      <ReviewRow label="Full name" value={adminDisplayName} />
                    )}
                  </dl>
                </div>

                <p className="text-xs text-muted-foreground">
                  The company and its administrator are created together. If the invitation cannot
                  be delivered, neither is kept — so you can correct the address and try again.
                </p>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(3)}
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
                <DialogTitle className="sr-only">Company onboarded</DialogTitle>
                <DialogDescription className="sr-only">
                  {created.name} was created and its administrator invited.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 text-center">
                <div className="mx-auto grid size-12 place-items-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 className="size-6" aria-hidden />
                </div>
                <p className="mt-4 text-base font-semibold text-foreground">
                  {created.name} is onboarded
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  An invitation with a single-use activation link was sent to
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {created.admin?.email || adminEmail}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  They set their own password from that link. Until they do, the account cannot be
                  signed into.
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
