import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/api/client'
import { useAsync } from '@/hooks/useAsync'
import { listCompanyOptions } from '@/api/platform.api'
import { useAuth } from '@/context/authContext'
import { cn } from '@/lib/utils'
import type { Connector, CreatedConnection } from '@/types/metadataLakehouse'
import { credentialFields, connectorPresentation } from '@/lib/connectors'
import { DEFAULT_DATASET_LIMIT } from '@/constants/metadataLakehouse'
import { useCreateConnection } from '@/hooks/useMetadataLakehouse'

type Phase = 'idle' | 'validating' | 'connected' | 'failed'

export function ConnectionForm({
  connector,
  onConnected,
  onCancel,
}: {
  connector: Connector
  onConnected: (result: CreatedConnection) => void
  onCancel: () => void
}) {
  const { user } = useAuth()
  const fields = credentialFields(connector)
  const presentation = connectorPresentation(connector.id)

  const [values, setValues] = useState<Record<string, string>>({})
  const [companyId, setCompanyId] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [failure, setFailure] = useState<string | null>(null)
  const [result, setResult] = useState<CreatedConnection | null>(null)

  const createConnection = useCreateConnection()

  const isPlatform = user?.companyId === null
  const companies = useAsync(
    () => (isPlatform ? listCompanyOptions() : Promise.resolve([])),
    [isPlatform]
  )

  const setValue = (id: string, value: string) => {
    setValues((v) => ({ ...v, [id]: value }))
    if (phase !== 'idle') {
      setPhase('idle')
      setFailure(null)
      setResult(null)
    }
  }

  const missing = fields.filter((f) => !values[f.id]?.trim()).map((f) => f.label)
  const canSubmit =
    missing.length === 0 && (!isPlatform || companyId !== '') && phase !== 'validating'

  const submit = async () => {
    setPhase('validating')
    setFailure(null)
    try {
      const created = await createConnection.mutateAsync({
        provider: connector.id,
        name: values.name?.trim() ?? '',
        host: values.host?.trim() ?? '',
        token: values.token ?? '',
        limit: DEFAULT_DATASET_LIMIT,
        ...(isPlatform ? { companyId: Number(companyId) } : {}),
      })
      setValues((v) => ({ ...v, token: '' }))
      setResult(created)
      setPhase('connected')
    } catch (err) {
      setPhase('failed')
      setFailure(
        errorMessage(
          err,
          'The credential could not be validated. Check the instance address and the token, then try again.'
        )
      )
    }
  }

  const locked = phase === 'validating' || phase === 'connected'

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="gap-0 overflow-hidden p-6 sm:max-w-lg">
        <DialogHeader className="flex-row items-center gap-3.5 space-0 text-left">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-black/5 dark:ring-white/10',
              presentation.accentClass
            )}
          >
            <presentation.icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-semibold leading-tight">
              Connect {connector.name}
            </DialogTitle>
            <DialogDescription className="mt-1 line-clamp-1 text-xs leading-relaxed">
              {connector.description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(100vh-15rem)] space-y-6 overflow-y-auto py-6">
          {isPlatform ? (
            <Field
              id="cred-company"
              label="Company"
              help="A connection belongs to one company. Platform accounts have none of their own."
            >
              <select
                id="cred-company"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                disabled={locked}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select a company…</option>
                {(companies.data ?? []).map((company) => (
                  <option key={company.id} value={String(company.id)}>
                    {company.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {fields.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
              This connector declares no credential fields. That is a backend configuration
              problem — a provider marked available must describe its own form.
            </p>
          ) : (
            <div className="space-y-6">
              {fields.map((field) => (
                <Field
                  key={field.id}
                  id={`cred-${field.id}`}
                  label={
                    field.id === 'host' ? field.label || presentation.hostLabel : field.label
                  }
                  help={field.help}
                  action={
                    field.type === 'secret' && connector.docsUrl ? (
                      <a
                        href={connector.docsUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                      >
                        Where do I find this?
                        <ExternalLink className="size-3" aria-hidden />
                      </a>
                    ) : null
                  }
                >
                  <Input
                    id={`cred-${field.id}`}
                    type={field.type === 'secret' ? 'password' : 'text'}
                    value={values[field.id] ?? ''}
                    placeholder={field.placeholder}
                    onChange={(e) => setValue(field.id, e.target.value)}
                    autoComplete={field.type === 'secret' ? 'off' : undefined}
                    {...(field.type === 'secret'
                      ? {
                          spellCheck: false,
                          'data-1p-ignore': true,
                          'data-lpignore': 'true',
                          className: 'h-10 font-mono tracking-wide',
                        }
                      : { className: 'h-10' })}
                    disabled={locked}
                  />
                </Field>
              ))}
            </div>
          )}

          {phase === 'connected' && result ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-3 dark:border-emerald-900 dark:bg-emerald-950/40">
              <CheckCircle2
                className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
              <div className="min-w-0 space-y-0.5 text-sm">
                <p className="font-medium text-emerald-800 dark:text-emerald-200">
                  Connection successful
                </p>
                <p className="truncate text-emerald-700 dark:text-emerald-300">
                  {result.connection.host}
                  {result.account.accountName ? ` · ${result.account.accountName}` : ''}
                </p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                  The token is stored encrypted and is not shown again.
                </p>
              </div>
            </div>
          ) : null}

          {phase === 'failed' && failure ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3.5 py-3"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
              <div className="min-w-0 space-y-0.5 text-sm">
                <p className="font-medium text-destructive">Connection failed</p>
                <p className="text-muted-foreground">{failure}</p>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-row items-center gap-3 border-t pt-4 sm:justify-between">
          <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
            Sent once, encrypted by the backend, never stored in the browser.
          </p>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>

            {phase === 'connected' && result ? (
              <Button size="sm" onClick={() => onConnected(result)}>
                Continue
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            ) : (
              <Button size="sm" onClick={submit} disabled={!canSubmit}>
                {phase === 'validating' ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Validating…
                  </>
                ) : (
                  'Connect'
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  id,
  label,
  help,
  action,
  className,
  children,
}: {
  id: string
  label: string
  help?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {action}
      </div>
      {children}
      {help ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{help}</p>
      ) : null}
    </div>
  )
}
