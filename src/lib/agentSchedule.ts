import type { AgentSchedule, AgentScheduleFrequency } from '@/types/agentLibrary'

export const SCHEDULE_FREQUENCIES: { value: AgentScheduleFrequency; label: string }[] = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function defaultSchedule(): AgentSchedule {
  return {
    enabled: true,
    frequency: 'daily',
    time: '09:00',
    timezone: browserTimezone(),
    daysOfWeek: [1],
    dayOfMonth: 1,
    date: new Date().toISOString().slice(0, 10),
    prompt: '',
    recipientEmail: '',
  }
}

export function validateSchedule(schedule: AgentSchedule): string | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time)) return 'Choose a time.'
  if (!schedule.prompt.trim()) return 'Tell the agent what to do when the schedule runs.'
  if (schedule.frequency === 'weekly' && !schedule.daysOfWeek?.length) return 'Pick at least one day.'
  if (schedule.frequency === 'monthly') {
    const day = schedule.dayOfMonth ?? 0
    if (!Number.isInteger(day) || day < 1 || day > 28) return 'Day of month must be between 1 and 28.'
  }
  if (schedule.frequency === 'once' && !schedule.date) return 'Choose a date.'
  const email = schedule.recipientEmail?.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Recipient email looks invalid.'
  return null
}

export function normalizeSchedule(schedule: AgentSchedule): AgentSchedule {
  const base: AgentSchedule = {
    enabled: schedule.enabled,
    frequency: schedule.frequency,
    time: schedule.time,
    timezone: schedule.timezone,
    prompt: schedule.prompt.trim(),
  }
  const email = schedule.recipientEmail?.trim()
  if (email) base.recipientEmail = email
  if (schedule.frequency === 'weekly') base.daysOfWeek = [...(schedule.daysOfWeek ?? [])].sort()
  if (schedule.frequency === 'monthly') base.dayOfMonth = schedule.dayOfMonth
  if (schedule.frequency === 'once') base.date = schedule.date
  return base
}

export function describeSchedule(schedule: AgentSchedule): string {
  const at = `at ${schedule.time}`
  switch (schedule.frequency) {
    case 'once':
      return `Once on ${schedule.date} ${at}`
    case 'daily':
      return `Daily ${at}`
    case 'weekly':
      return `Every ${(schedule.daysOfWeek ?? []).map((d) => WEEKDAYS[d]).join(', ')} ${at}`
    case 'monthly':
      return `Monthly on day ${schedule.dayOfMonth} ${at}`
  }
}
