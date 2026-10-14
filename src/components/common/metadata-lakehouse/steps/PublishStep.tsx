import { useState } from 'react'
import { ArrowLeft, Loader2, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { StepFrame } from '@/components/common/metadata-lakehouse/StepFrame'
import {
  EmptyState,
  NoConnectionState,
  CardSkeleton,
  QueryBoundary,
  TileSkeleton,
} from '@/components/common/metadata-lakehouse/DataStates'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionHeading, StatTile } from '@/components/common/metadata-lakehouse/primitives'
import { formatDateTime, formatExact, formatRelativeTime } from '@/lib/format'
import { endpoints } from '@/api/endpoints'
import { usePublish, usePublishSummary, useValidatePublish } from '@/hooks/useMetadataLakehouse'
import { useWorkflow } from '@/context/workflowContext'
import { useAuth } from '@/context/authContext'
import type { PublishBlocker, PublishResult, PublishSummary } from '@/types/metadataLakehouse'

const KPI_IDS = ['approved', 'pending', 'tables', 'columns']

export function PublishStep() {
  const { connectionId, goToStep, back, readOnly } = useWorkflow()
  const canPublish = useAuth().can('context.publish')
  const summary = usePublishSummary(connectionId)
  const validate = useValidatePublish(connectionId)
  const publish = usePublish(connectionId)

  const [published, setPublished] = useState<PublishResult | null>(null)

  if (!connectionId) {
    return (
      <StepFrame title="Publish to the Metadata Lakehouse" hideNext>
        <NoConnectionState onConnect={() => goToStep('connect')} />
      </StepFrame>
    )
  }

  const data = summary.data
  const name = (data?.suggestedName ?? '').trim()
  const busy = validate.isPending || publish.isPending
  const showPublish = !readOnly && canPublish && !published && !data?.publishedVersion

  const run = async () => {
    try {
      const verdict = await validate.mutateAsync()
      if (!verdict.valid) {
        notify.error(
          'This context cannot be published yet.',
          `${verdict.blockers.length} item${verdict.blockers.length === 1 ? '' : 's'} need attention.`
        )
        return
      }
      const result = await publish.mutateAsync({ name, notifyTeam: true })
      setPublished(result)
      notify.success(
        `“${result.name}” published.`,
        `${result.version} · ${result.objectCount} fact${result.objectCount === 1 ? '' : 's'}`
      )
    } catch (err) {
      notify.failure('publish to the Metadata Lakehouse', err)
    }
  }

  return (
    <StepFrame
      title="Publish to the Metadata Lakehouse"
      description={
        readOnly
          ? 'What this version contains, as it was published.'
          : 'Review the summary and publish. This makes the context available to chat, reports and agents.'
      }
      hideNext
      hideBack={showPublish}
      actions={
        showPublish ? (
          <>
            <Button variant="outline" size="sm" onClick={back} disabled={busy}>
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </Button>
            <Button size="sm" onClick={() => void run()} disabled={busy || !data?.ready || name.length < 2}>
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {validate.isPending ? 'Validating…' : 'Publishing…'}
                </>
              ) : (
                <>
                  <Rocket className="size-4" aria-hidden />
                  Publish
                </>
              )}
            </Button>
          </>
        ) : undefined
      }
      refreshing={summary.isFetching && !summary.isPending}
    >
      <QueryBoundary
        query={summary}
        step="Publish"
        endpoint={`GET ${endpoints.context.publishSummary(connectionId)}`}
        context="load the publish summary"
        loading={
          <div className="space-y-6">
            <Skeleton className="h-16 w-full rounded-lg" />
            <TileSkeleton count={4} className="grid-cols-2 lg:grid-cols-4" />
            <div className="grid gap-6 lg:grid-cols-2">
              <CardSkeleton rows={3} columns={2} />
              <CardSkeleton rows={3} columns={2} />
            </div>
          </div>
        }
      >
        {(data) => {
          const kpis = KPI_IDS.flatMap((id) => data.stats.filter((stat) => stat.id === id))
          return (
            <div className="space-y-6">
              {data.publishedVersion ? (
                <div className="border-l-2 border-primary pl-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Published · {data.publishedVersion.label}
                  </p>
                  <p className="mt-1 font-serif text-3xl font-semibold leading-tight tracking-tight">
                    {data.publishedVersion.name}
                  </p>
                  <p className="mt-2 max-w-[70ch] font-serif text-[15.5px] leading-7 text-foreground/80">
                    Published {formatRelativeTime(data.publishedVersion.publishedAt)} with{' '}
                    {formatExact(data.publishedVersion.objectCount)} fact
                    {data.publishedVersion.objectCount === 1 ? '' : 's'}. A published version never
                    changes; editing creates the next version.
                  </p>
                </div>
              ) : published ? (
                <PublishedBanner result={published} />
              ) : (
                <ReadinessBanner summary={data} />
              )}

              {!readOnly && !canPublish && !published && !data.publishedVersion ? (
                <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                  Your role can build this draft but not publish it. Someone with Publish Contexts
                  can publish it from here.
                </p>
              ) : null}

              {kpis.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {kpis.map((stat) => {
                    const awaiting = stat.id === 'pending' && Number(stat.value) > 0 && !readOnly
                    return (
                      <StatTile
                        key={stat.id}
                        label={stat.label}
                        value={stat.value}
                        hint={awaiting ? 'not published until approved' : undefined}
                        onClick={awaiting ? () => goToStep('review') : undefined}
                      />
                    )
                  })}
                </div>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-2">
                <section>
                  <SectionHeading title="Included datasets" />
                  {data.datasets.length === 0 ? (
                    <EmptyState title="No datasets included" />
                  ) : (
                    <ul className="divide-y rounded-2xl border bg-card">
                      {data.datasets.map((dataset) => (
                        <li
                          key={dataset.id}
                          className="flex items-baseline justify-between gap-3 px-5 py-3"
                        >
                          <span className="truncate font-serif text-[15.5px]">{dataset.name}</span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {dataset.tableCount !== null
                              ? `${formatExact(dataset.tableCount)} tables`
                              : '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <SectionHeading title={data.publishedVersion ? 'What was published' : 'What will be published'} />
                  {data.content.length === 0 ? (
                    <EmptyState title="Nothing listed" />
                  ) : (
                    <ul className="divide-y rounded-2xl border bg-card">
                      {data.content.map((entry) => (
                        <li key={entry.id} className="flex items-baseline justify-between gap-3 px-5 py-3">
                          <span
                            className={cn(
                              'font-serif text-[15.5px]',
                              !entry.included && 'text-muted-foreground line-through decoration-muted-foreground/40'
                            )}
                          >
                            {entry.label}
                          </span>
                          <span
                            className={cn(
                              'text-[11px] font-semibold uppercase tracking-[0.12em]',
                              entry.included ? 'text-primary' : 'text-muted-foreground'
                            )}
                          >
                            {entry.included ? 'Included' : 'None'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              {data.blockers.length > 0 ? (
                <BlockerList blockers={data.blockers} onGoTo={goToStep} />
              ) : null}
            </div>
          )
        }}
      </QueryBoundary>
    </StepFrame>
  )
}

function ReadinessBanner({ summary }: { summary: PublishSummary }) {
  const ready = summary.ready && summary.blockers.length === 0
  return (
    <div className={cn('border-l-2 pl-5', ready ? 'border-primary' : 'border-destructive')}>
      <p
        className={cn(
          'text-[11px] font-semibold uppercase tracking-[0.14em]',
          ready ? 'text-primary' : 'text-destructive'
        )}
      >
        {ready ? 'Ready' : 'Not ready yet'}
      </p>
      <p className="mt-1 font-serif text-3xl font-semibold leading-tight tracking-tight">
        {ready ? 'Ready to publish' : 'A few things to resolve first'}
      </p>
      <p className="mt-2 max-w-[70ch] font-serif text-[15.5px] leading-7 text-foreground/80">
        {ready
          ? 'The backend reports this context as complete. Read through the details below, then publish.'
          : `${summary.blockers.length} item${summary.blockers.length === 1 ? '' : 's'} must be resolved before this can be published.`}
      </p>
    </div>
  )
}

function PublishedBanner({ result }: { result: PublishResult }) {
  return (
    <div className="border-l-2 border-primary pl-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
        Published · {result.version}
      </p>
      <p className="mt-1 font-serif text-3xl font-semibold leading-tight tracking-tight">“{result.name}” is live</p>
      <p className="mt-2 font-serif text-[15.5px] leading-7 text-foreground/80">
        {result.objectCount} fact{result.objectCount === 1 ? '' : 's'} · {formatDateTime(result.publishedAt)}
      </p>
    </div>
  )
}

function BlockerList({
  blockers,
  onGoTo,
}: {
  blockers: PublishBlocker[]
  onGoTo: (step: NonNullable<PublishBlocker['step']>) => void
}) {
  return (
    <section>
      <SectionHeading title="Needs attention" />
      <ul className="space-y-2">
        {blockers.map((blocker) => (
          <li
            key={blocker.id}
            className={cn(
              'flex flex-wrap items-center gap-3 border-l-2 py-2 pl-4 font-serif text-[15px]',
              blocker.severity === 'blocker' ? 'border-l-destructive' : 'border-l-muted-foreground/50'
            )}
          >
            <span
              className={cn(
                'font-sans text-[11px] font-semibold uppercase tracking-[0.12em]',
                blocker.severity === 'blocker' ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {blocker.severity === 'blocker' ? 'Blocker' : 'Note'}
            </span>
            <span className="min-w-0 flex-1">{blocker.message}</span>
            {blocker.step ? (
              <Button size="sm" variant="outline" onClick={() => onGoTo(blocker.step!)}>
                Go to {blocker.step}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
