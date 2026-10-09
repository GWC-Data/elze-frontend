import { useId, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BrainCircuit, CheckCircle2, Circle, Layers, Loader2, MessageSquare, Trash2 } from 'lucide-react'

import { AgentLibraryError, agentLibraryApi } from '@/api/agentLibrary.api'
import { useAsync } from '@/hooks/useAsync'
import { usePaths } from '@/hooks/usePaths'
import { notify } from '@/lib/notify'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { Field } from '@/components/common/Fields'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CardGridSkeleton, ErrorState, NotFoundState, PermissionDeniedState } from '@/components/common/States'
import { useAuth } from '@/context/authContext'
import { agentAccess } from '@/lib/agentAccess'
import { KnowledgePicker } from '@/components/common/agent-library/KnowledgePicker'
import { boxField } from '@/components/common/agent-library/ScheduleDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { LibraryAgent, LibraryAgentInput } from '@/types/agentLibrary'

const LIMITS = { name: 80, description: 280, role: 200, instructions: 8000 }

const EMPTY: LibraryAgentInput = { name: '', description: '', role: '', instructions: '', knowledge: [] }

function fromAgent(agent: LibraryAgent | null): LibraryAgentInput {
  if (!agent) return EMPTY
  const { name, description, role, instructions, knowledge } = agent
  return { name, description, role, instructions, knowledge }
}

type Errors = Partial<Record<keyof LibraryAgentInput, string>>

function validate(input: LibraryAgentInput): Errors {
  const errors: Errors = {}
  if (!input.name.trim()) errors.name = 'Give the agent a name.'
  if (!input.role.trim()) errors.role = 'Say who the agent is.'
  if (input.instructions.trim().length < 20)
    errors.instructions = "Instructions drive the agent's behaviour. Write at least a couple of sentences."
  if (input.knowledge.length === 0) errors.knowledge = 'Pick at least one published context for the agent to use.'
  return errors
}

function sameInput(a: LibraryAgentInput, b: LibraryAgentInput): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function TextAreaField({
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
  rows,
  max,
  mono,
  required,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: ReactNode
  error?: string
  placeholder?: string
  rows: number
  max: number
  mono?: boolean
  required?: boolean
  disabled?: boolean
}) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required}>
      <Textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={max}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className={mono ? `${boxField} py-2.5 font-mono text-[13px] leading-relaxed md:text-[13px]` : `${boxField} py-2.5`}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

export default function LibraryAgentPage() {
  const { agentId } = useParams()
  const paths = usePaths()
  const navigate = useNavigate()
  const nameId = useId()
  const isNew = !agentId

  const loaded = useAsync(() => (agentId ? agentLibraryApi.get(agentId) : Promise.resolve(null)), [agentId])
  const { can, user } = useAuth()

  const [latest, setLatest] = useState<LibraryAgent | null>(null)
  const agent = latest && latest.id === agentId ? latest : loaded.data

  const [edited, setEdited] = useState<LibraryAgentInput | null>(null)
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const form = edited ?? fromAgent(agent)
  const errors = touched ? validate(form) : {}
  const dirty = !sameInput(form, fromAgent(agent))
  const set = <K extends keyof LibraryAgentInput>(key: K, value: LibraryAgentInput[K]) =>
    setEdited({ ...form, [key]: value })

  const crumbs = [
    { label: 'Agents', to: paths.agentLibrary },
    ...(agent ? [{ label: agent.name, to: paths.libraryAgent(agent.id) }] : []),
    { label: isNew ? 'New agent' : 'Edit' },
  ]

  if (loaded.error && !agent) {
    const missing = loaded.error instanceof AgentLibraryError && loaded.error.status === 404
    return (
      <Page>
        <PageHeader title="Agent" crumbs={crumbs} />
        <Section flush>
          {missing ? (
            <NotFoundState detail="This agent does not exist. It may have been deleted." backTo={paths.agentLibrary} />
          ) : (
            <ErrorState error={loaded.error} title="Unable to load the agent" onRetry={loaded.reload} />
          )}
        </Section>
      </Page>
    )
  }

  const allowed = agent ? agentAccess(agent, user?.id, can) : null
  if (agent && allowed && !allowed.edit) {
    return (
      <Page>
        <PageHeader title={agent.name} crumbs={crumbs} />
        <Section flush>
          <PermissionDeniedState
            detail="Only the person who created this agent can edit it, or someone whose role manages everyone's agents."
            backTo={paths.libraryAgent(agent.id)}
          />
        </Section>
      </Page>
    )
  }

  if (loaded.loading && !agent) {
    return (
      <Page>
        <PageHeader title="Loading agent…" crumbs={crumbs} />
        <CardGridSkeleton count={2} />
      </Page>
    )
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (Object.keys(validate(form)).length > 0) return
    const input: LibraryAgentInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      role: form.role.trim(),
      instructions: form.instructions.trim(),
      knowledge: form.knowledge,
    }
    setSaving(true)
    try {
      if (agent) {
        const saved = await agentLibraryApi.update(agent.id, input)
        setLatest(saved)
        setEdited(null)
        setTouched(false)
        notify.success('Agent saved.')
      } else {
        const created = await agentLibraryApi.create({ ...input, ownerId: user?.id })
        notify.success('Agent created.', 'Ask it anything about its contexts.')
        navigate(paths.libraryAgent(created.id), { replace: true })
      }
    } catch (err) {
      notify.failure(agent ? 'save the agent' : 'create the agent', err)
    } finally {
      setSaving(false)
    }
  }

  const discard = () => {
    if (isNew) {
      navigate(paths.agentLibrary)
      return
    }
    setEdited(null)
    setTouched(false)
  }

  const remove = async () => {
    if (!agent) return
    setDeleting(true)
    try {
      await agentLibraryApi.remove(agent.id)
      notify.success(`Deleted ${agent.name}.`)
      navigate(paths.agentLibrary)
    } catch (err) {
      notify.failure('delete the agent', err)
      setDeleting(false)
    }
  }

  const checklist = [
    { label: 'Name', done: Boolean(form.name.trim()) },
    { label: 'Role', done: Boolean(form.role.trim()) },
    { label: 'Instructions', done: form.instructions.trim().length >= 20 },
    { label: 'At least one context', done: form.knowledge.length > 0 },
  ]
  const ready = checklist.every((item) => item.done)

  return (
    <Page>
      <PageHeader
        crumbs={crumbs}
        icon={
          <span className="grid size-10 place-items-center rounded-xl border border-border bg-muted text-foreground">
            <BrainCircuit className="size-5" aria-hidden />
          </span>
        }
        title={isNew ? 'New agent' : `Edit ${agent?.name ?? 'agent'}`}
        description={
          isNew
            ? 'Define who the agent is and how it behaves, then pick the published contexts it answers from.'
            : agent?.description || undefined
        }
        actions={
          agent ? (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate(paths.libraryAgent(agent.id))}>
                <MessageSquare aria-hidden />
                Open chat
              </Button>
              {allowed?.remove ? (
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
                  <Trash2 aria-hidden />
                  Delete
                </Button>
              ) : null}
            </>
          ) : undefined
        }
      />

      <form onSubmit={save} noValidate className="grid items-start gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
        <Section
          className="mt-0"
          title={<StepTitle step={1} label="Details" />}
          description="How the agent appears across the product."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Agent name"
              htmlFor={nameId}
              hint="Shown on the agent's card and at the top of its chat."
              error={errors.name}
              required
            >
              <Input
                id={nameId}
                className={boxField}
                value={form.name}
                maxLength={LIMITS.name}
                placeholder="e.g. Revenue Analyst"
                disabled={saving}
                autoFocus={isNew}
                aria-invalid={Boolean(errors.name)}
                onChange={(e) => set('name', e.target.value)}
              />
            </Field>
            <TextAreaField
              label="Description"
              value={form.description}
              onChange={(value) => set('description', value)}
              placeholder="Answers questions about monthly revenue, churn and pipeline."
              hint="Optional. One or two lines on what this agent is for."
              rows={2}
              max={LIMITS.description}
              disabled={saving}
            />
          </div>
        </Section>

        <Section
          title={<StepTitle step={2} label="Role and instructions" />}
          description="The most important part: they decide how the agent answers."
        >
          <div className="space-y-4">
            <TextAreaField
              label="Role"
              value={form.role}
              onChange={(value) => set('role', value)}
              placeholder="You are a senior financial analyst for the sales leadership team."
              hint="Who the agent is: its persona and expertise."
              error={errors.role}
              rows={2}
              max={LIMITS.role}
              required
              disabled={saving}
            />
            <TextAreaField
              label="Instructions"
              value={form.instructions}
              onChange={(value) => set('instructions', value)}
              placeholder={
                '1. Answer only from the attached knowledge.\n2. Always state the time period of a figure.\n3. Lead with the answer, then a short table.\n4. If the data does not cover the question, say so. Never guess.'
              }
              hint="Goals, steps, tone, output format and what it must never do."
              error={errors.instructions}
              rows={12}
              max={LIMITS.instructions}
              mono
              required
              disabled={saving}
            />
          </div>
        </Section>

        <Section
          title={
            <StepTitle
              step={3}
              label={
                <>
                  Knowledge <span className="text-destructive" aria-hidden>*</span>
                </>
              }
            />
          }
          description="Published Metadata Lakehouse contexts the agent answers from. Pick at least one; pick a version to pin it."
          actions={
            form.knowledge.length > 0 ? (
              <span className="text-xs text-muted-foreground">{form.knowledge.length} selected</span>
            ) : undefined
          }
        >
          <KnowledgePicker value={form.knowledge} onChange={(next) => set('knowledge', next)} disabled={saving} />
          {errors.knowledge && <p className="mt-2 text-xs text-destructive">{errors.knowledge}</p>}
        </Section>

        </div>

        <aside className="min-w-0 lg:sticky lg:top-6 lg:col-span-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border bg-muted/50 px-5 py-4">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Preview</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-background text-foreground">
                  <BrainCircuit className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{form.name.trim() || 'Untitled agent'}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{form.description.trim() || 'No description yet.'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Role</p>
                <p className="mt-1 line-clamp-3 text-sm text-foreground">
                  {form.role.trim() || <span className="italic text-muted-foreground">Not set</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Knowledge</p>
                {form.knowledge.length === 0 ? (
                  <p className="mt-1 text-sm italic text-muted-foreground">No context picked</p>
                ) : (
                  <ul className="mt-1.5 space-y-1">
                    {form.knowledge.map((ref) => (
                      <li key={ref.contextVersionId} className="flex items-center gap-1.5 text-sm">
                        <Layers className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="truncate">{ref.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{ref.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium text-muted-foreground">Before you {isNew ? 'create' : 'save'}</p>
                <ul className="mt-2 space-y-1.5">
                  {checklist.map((item) => (
                    <li key={item.label} className="flex items-center gap-2 text-sm">
                      {item.done ? (
                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      ) : (
                        <Circle className="size-4 text-muted-foreground/60" aria-hidden />
                      )}
                      <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <Button type="submit" className="w-full" disabled={saving || (!isNew && !dirty)}>
                  {saving && <Loader2 className="animate-spin" aria-hidden />}
                  {isNew ? 'Create agent' : 'Save changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={saving || (!isNew && !dirty)}
                  onClick={discard}
                >
                  {isNew ? 'Cancel' : 'Discard changes'}
                </Button>
                {isNew && !ready && (
                  <p className="text-center text-xs text-muted-foreground">Complete the checklist to create the agent.</p>
                )}
              </div>
            </div>
          </div>
        </aside>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${agent?.name ?? 'agent'}?`}
        body="This removes the agent and its schedule."
        consequence="The published contexts it used are not affected."
        confirmLabel="Delete agent"
        destructive
        pending={deleting}
        onConfirm={remove}
      />
    </Page>
  )
}

function StepTitle({ step, label }: { step: number; label: ReactNode }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-6 place-items-center rounded-full border border-border bg-muted text-[11px] font-semibold text-foreground tabular-nums">
        {step}
      </span>
      {label}
    </span>
  )
}
