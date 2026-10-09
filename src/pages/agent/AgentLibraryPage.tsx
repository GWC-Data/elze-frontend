import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlarmClock, BrainCircuit, Layers, Pencil, Plus } from 'lucide-react'

import { agentLibraryApi } from '@/api/agentLibrary.api'
import { useAsync } from '@/hooks/useAsync'
import { usePaths } from '@/hooks/usePaths'
import { describeSchedule } from '@/lib/agentSchedule'
import { agentAccess } from '@/lib/agentAccess'
import { useAuth } from '@/context/authContext'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/common/States'
import { Hint } from '@/components/common/Hint'
import { ScheduleDialog } from '@/components/common/agent-library/ScheduleDialog'
import { Button } from '@/components/ui/button'
import type { LibraryAgent } from '@/types/agentLibrary'

const updated = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export default function AgentLibraryPage() {
  const paths = usePaths()
  const { can, user } = useAuth()
  const canCreate = can('agent.create')
  const { data, error, loading, reload } = useAsync(() => agentLibraryApi.list())
  const agents = data ?? []
  const [scheduling, setScheduling] = useState<LibraryAgent | null>(null)

  const createButton = canCreate && (
    <Button asChild size="sm">
      <Link to={paths.libraryAgentEdit()}>
        <Plus className="size-4" aria-hidden />
        Create agent
      </Link>
    </Button>
  )

  return (
    <Page>
      <PageHeader
        title="Agents"
        description="Build your own agents: give each a role, instructions and published contexts as knowledge, then schedule it to run."
        actions={createButton || undefined}
      />

      {loading ? (
        <CardGridSkeleton count={3} />
      ) : error ? (
        <Section flush>
          <ErrorState error={error} title="Unable to load agents" onRetry={reload} />
        </Section>
      ) : agents.length === 0 ? (
        <Section flush>
          <EmptyState
            title="No agents yet"
            icon={BrainCircuit}
            body="Create one to give it a name, a role, instructions and the published contexts it may use."
            action={
              canCreate ? (
                <Button asChild>
                  <Link to={paths.libraryAgentEdit()}>
                    <Plus aria-hidden />
                    Create agent
                  </Link>
                </Button>
              ) : undefined
            }
          />
        </Section>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => {
            const schedule = agent.schedule
            const allowed = agentAccess(agent, user?.id, can)
            return (
              <li
                key={agent.id}
                className="group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    <BrainCircuit className="size-4" aria-hidden />
                  </span>
                  {schedule && (
                    <span
                      className={
                        schedule.enabled
                          ? 'flex items-center gap-1 text-xs font-medium text-primary'
                          : 'flex items-center gap-1 text-xs text-muted-foreground'
                      }
                    >
                      <AlarmClock className="size-3.5" aria-hidden />
                      {schedule.enabled ? 'Scheduled' : 'Paused'}
                    </span>
                  )}
                </div>

                <Link
                  to={paths.libraryAgent(agent.id)}
                  className="mt-3 font-semibold text-card-foreground after:absolute after:inset-0 after:rounded-xl"
                >
                  {agent.name}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{agent.description}</p>
                <p className="mt-2 line-clamp-2 text-xs text-foreground">
                  <span className="font-medium">Role: </span>
                  {agent.role}
                </p>

                <div className="mt-3 flex flex-1 flex-wrap content-start gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {agent.knowledge.length === 0 ? (
                    <span className="italic">No knowledge attached</span>
                  ) : (
                    agent.knowledge.map((ref) => (
                      <span key={ref.contextVersionId} className="flex items-center gap-1">
                        <Layers className="size-3" aria-hidden />
                        {ref.name} <span className="font-mono">{ref.label}</span>
                      </span>
                    ))
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                  <span className="truncate text-xs text-muted-foreground">
                    {schedule ? describeSchedule(schedule) : `Updated ${updated.format(new Date(agent.updatedAt))}`}
                  </span>
                  <div className="relative z-10 flex shrink-0 items-center gap-1">
                    {allowed.edit ? (
                      <Hint label="Edit agent">
                        <Button asChild size="icon-sm" variant="ghost" aria-label={`Edit ${agent.name}`}>
                          <Link to={paths.libraryAgentEdit(agent.id)}>
                            <Pencil aria-hidden />
                          </Link>
                        </Button>
                      </Hint>
                    ) : null}
                    {allowed.schedule ? (
                      <Button size="sm" variant="outline" onClick={() => setScheduling(agent)}>
                        <AlarmClock aria-hidden />
                        {schedule ? 'Edit schedule' : 'Schedule'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ScheduleDialog
        key={scheduling?.id ?? 'closed'}
        agent={scheduling}
        onOpenChange={(open) => !open && setScheduling(null)}
        onSaved={reload}
      />
    </Page>
  )
}
