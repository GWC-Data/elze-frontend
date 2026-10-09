import { useState } from 'react'
import { Loader2 } from 'lucide-react'

import { agentLibraryApi } from '@/api/agentLibrary.api'
import { useAuth } from '@/context/authContext'
import {
  SCHEDULE_FREQUENCIES,
  WEEKDAYS,
  defaultSchedule,
  describeSchedule,
  normalizeSchedule,
  validateSchedule,
} from '@/lib/agentSchedule'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { Field } from '@/components/common/Fields'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { AgentSchedule, LibraryAgent } from '@/types/agentLibrary'

export const boxField =
  'rounded-lg bg-muted/40 px-3 shadow-xs transition-colors hover:border-foreground/20 focus-visible:bg-background'

export function ScheduleDialog({
  agent,
  onOpenChange,
  onSaved,
}: {
  agent: LibraryAgent | null
  onOpenChange: (open: boolean) => void
  onSaved: (agent: LibraryAgent) => void
}) {
  const { user } = useAuth()
  const [draft, setDraft] = useState<AgentSchedule>(() => ({
    ...defaultSchedule(),
    recipientEmail: user?.email ?? '',
    ...(agent?.schedule ?? {}),
  }))
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null)

  const problem = validateSchedule(draft)
  const set = <K extends keyof AgentSchedule>(key: K, value: AgentSchedule[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  const toggleDay = (day: number) => {
    const days = new Set(draft.daysOfWeek ?? [])
    if (days.has(day)) days.delete(day)
    else days.add(day)
    set('daysOfWeek', [...days])
  }

  const run = async (kind: 'save' | 'remove') => {
    if (!agent) return
    if (kind === 'save') {
      setTouched(true)
      if (problem) return
    }
    setBusy(kind)
    try {
      const saved =
        kind === 'save'
          ? await agentLibraryApi.setSchedule(agent.id, normalizeSchedule(draft))
          : await agentLibraryApi.clearSchedule(agent.id)
      onSaved(saved)
      notify.success(kind === 'save' ? 'Schedule saved.' : 'Schedule removed.')
      onOpenChange(false)
    } catch (err) {
      notify.failure(kind === 'save' ? 'save the schedule' : 'remove the schedule', err)
    } finally {
      setBusy(null)
    }
  }

  const disabled = busy !== null

  return (
    <Dialog open={agent !== null} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule {agent?.name}</DialogTitle>
          <DialogDescription>Run this agent automatically at a set time.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">

          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-xs font-medium text-foreground">Active</span>
              <span className="block text-xs text-muted-foreground">Turn off to pause without losing the settings.</span>
            </span>
            <Switch checked={draft.enabled} onCheckedChange={(on) => set('enabled', on)} disabled={disabled} />
          </label>

          <Field label="Repeat" htmlFor="schedule-repeat">
            <div id="schedule-repeat" role="radiogroup" className="inline-flex border border-border p-0.5">
              {SCHEDULE_FREQUENCIES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={draft.frequency === option.value}
                  disabled={disabled}
                  onClick={() => set('frequency', option.value)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium transition-colors',
                    draft.frequency === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Field>

          {draft.frequency === 'weekly' && (
            <Field label="On" htmlFor="schedule-days" required>
              <div id="schedule-days" className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((label, day) => {
                  const on = draft.daysOfWeek?.includes(day) ?? false
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={on}
                      disabled={disabled}
                      onClick={() => toggleDay(day)}
                      className={cn(
                        'border px-2.5 py-1 text-xs font-medium transition-colors',
                        on ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {draft.frequency === 'once' && (
              <Field label="Date" htmlFor="schedule-date" required>
                <Input
                  id="schedule-date"
                  type="date"
                  className={boxField}
                  value={draft.date ?? ''}
                  disabled={disabled}
                  onChange={(e) => set('date', e.target.value)}
                />
              </Field>
            )}
            {draft.frequency === 'monthly' && (
              <Field label="Day of month" htmlFor="schedule-dom" hint="1–28" required>
                <Input
                  id="schedule-dom"
                  type="number"
                  min={1}
                  max={28}
                  className={boxField}
                  value={draft.dayOfMonth ?? 1}
                  disabled={disabled}
                  onChange={(e) => set('dayOfMonth', Number(e.target.value))}
                />
              </Field>
            )}
            <Field label="Time" htmlFor="schedule-time" required>
              <Input
                id="schedule-time"
                type="time"
                className={boxField}
                value={draft.time}
                disabled={disabled}
                onChange={(e) => set('time', e.target.value)}
              />
            </Field>
            <Field label="Time zone" htmlFor="schedule-tz">
              <Input
                id="schedule-tz"
                className={boxField}
                value={draft.timezone}
                disabled={disabled}
                onChange={(e) => set('timezone', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Task" htmlFor="schedule-prompt" hint="What the agent is asked each time it runs." required>
            <Textarea
              id="schedule-prompt"
              rows={3}
              className={boxField}
              value={draft.prompt}
              disabled={disabled}
              placeholder="Summarise yesterday's revenue by region and flag anything more than 10% off plan."
              onChange={(e) => set('prompt', e.target.value)}
            />
          </Field>

          <Field label="Send result to" htmlFor="schedule-email" hint="Defaults to your account's email.">
            <Input
              id="schedule-email"
              type="email"
              className={boxField}
              value={draft.recipientEmail ?? ''}
              disabled={disabled}
              placeholder="name@company.com"
              onChange={(e) => set('recipientEmail', e.target.value)}
            />
          </Field>

          <p className={cn('text-xs', touched && problem ? 'text-destructive' : 'text-muted-foreground')}>
            {touched && problem ? problem : problem ? '' : `${describeSchedule(draft)} (${draft.timezone})`}
          </p>
        </div>

        <DialogFooter className="sm:justify-between">
          {agent?.schedule ? (
            <Button type="button" variant="outline" disabled={disabled} onClick={() => run('remove')}>
              {busy === 'remove' && <Loader2 className="animate-spin" aria-hidden />}
              Remove schedule
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={disabled} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={disabled} onClick={() => run('save')}>
              {busy === 'save' && <Loader2 className="animate-spin" aria-hidden />}
              Save schedule
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
