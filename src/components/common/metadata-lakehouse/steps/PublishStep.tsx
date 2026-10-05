import { useState } from 'react'
import { History, Loader2, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { StepFrame } from '@/components/common/metadata-lakehouse/StepFrame'
import {
  EmptyState,
  NoConnectionState,
  CardSkeleton,
  QueryBoundary,
  TableSkeleton,
  TileSkeleton,
} from '@/components/common/metadata-lakehouse/DataStates'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionHeading, StatTile } from '@/components/common/metadata-lakehouse/primitives'
import { VersionBadge } from '@/components/common/metadata-lakehouse/VersionBadge'
import { formatDateTime, formatExact, formatRelativeTime } from '@/lib/format'
import { endpoints } from '@/api/endpoints'
import {
  useContextVersions,
  usePublish,
  usePublishSummary,
  useValidatePublish,
} from '@/hooks/useMetadataLakehouse'
import { useWorkflow } from '@/context/workflowContext'
import { useAuth } from '@/context/authContext'
import type {
  ContextVersion,
  PublishBlocker,
  PublishResult,
  PublishSummary,
} from '@/types/metadataLakehouse'

export function PublishStep() {
  const { connectionId, goToStep, readOnly } = useWorkflow()
  // Editing a draft (context.update) and publishing it (context.publish) are separate grants.
  const canPublish = useAuth().can('context.publish')
  const summary = usePublishSummary(connectionId)
  const validate = useValidatePublish(connectionId)
  const publish = usePublish(connectionId)

  const [notifyTeam, setNotifyTeam] = useState(true)
  const [published, setPublished] = useState<PublishResult | null>(null)

  const [nameDraft, setNameDraft] = useState<string | null>(null)

  if (!connectionId) {
    return (
      <StepFrame title="Publish to the Metadata Lakehouse" hideNext>
        <NoConnectionState onConnect={() => goToStep('connect')} />
      </StepFrame>
    )
  }

  const run = async (name: string) => {
    try {
      const verdict = await validate.mutateAsync()
      if (!verdict.valid) {
        notify.error(
          'This context cannot be published yet.',
          `${verdict.blockers.length} item${verdict.blockers.length === 1 ? '' : 's'} need attention.`
        )
        return
      }
      const result = await publish.mutateAsync({ name, notifyTeam })
      setPublished(result)
      notify.success(
        `“${result.name}” published.`,
        `${result.version} · ${result.objectCount} fact${result.objectCount === 1 ? '' : 's'}`
      )
    } catch (err) {
      notify.failure('publish to the Metadata Lakehouse', err)
    }
  }

  const busy = validate.isPending || publish.isPending

  return (
    <StepFrame
      title="Publish to the Metadata Lakehouse"
      description={
        readOnly
          ? 'What this version contains, as it was published.'
          : 'Review the summary and publish. This makes the context available to chat, dashboards, reports and agents.'
      }
      hideNext
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
            <TileSkeleton count={8} className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" />
            <div className="grid gap-6 lg:grid-cols-2">
              <CardSkeleton rows={3} columns={2} />
              <CardSkeleton rows={3} columns={2} />
            </div>
          </div>
        }
      >
        {(data) => (
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

            {data.stats.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {data.stats.map((stat) => (
                  <StatTile key={stat.id} label={stat.label} value={stat.value} />
                ))}
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

            {published || readOnly ? null : !canPublish ? (
              <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                Your role can build this draft but not publish it. Someone with Publish Contexts
                can publish it from here.
              </p>
            ) : (
              <div className="space-y-4 rounded-lg border bg-card p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="context-name">Context name</Label>
                  <Input
                    id="context-name"
                    value={nameDraft ?? data.suggestedName ?? ''}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Revenue"
                    maxLength={120}
                  />
                  <p className="text-xs text-muted-foreground">
                    What this context is for, not where it came from. Everything approved is
                    stored under this name
                    {data.previousVersion !== null ? (
                      <>
                        {' '}
                        — publishing again as{' '}
                        <strong className="font-medium text-foreground">
                          {data.suggestedName}
                        </strong>{' '}
                        makes v{data.previousVersion + 1}
                      </>
                    ) : null}
                    .
                  </p>
                  {data.draft ? (
                    <p className="text-xs text-muted-foreground">
                      Publishing turns{' '}
                      <VersionBadge status="draft" label={data.draft.label} className="align-middle" />{' '}
                      into a published version. Earlier published versions are kept unchanged.
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="notify-team"
                      checked={notifyTeam}
                      onCheckedChange={(checked) => setNotifyTeam(checked === true)}
                    />
                    <Label htmlFor="notify-team" className="text-sm font-normal">
                      Notify team after publishing
                    </Label>
                  </div>

                  <Button
                    onClick={() => run((nameDraft ?? data.suggestedName ?? '').trim())}
                    disabled={
                      busy || !data.ready || (nameDraft ?? data.suggestedName ?? '').trim().length < 2
                    }
                  >
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
                </div>
              </div>
            )}

            <VersionHistory connectionId={connectionId} />
          </div>
        )}
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

function VersionHistory({ connectionId }: { connectionId: string }) {
  const versions = useContextVersions(connectionId)
  const rows = versions.data?.versions ?? []
  if (versions.isPending) {
    return (
      <section>
        <SectionHeading title="Version history" />
        <div className="rounded-lg border bg-card p-3">
          <TableSkeleton rows={2} columns={4} />
        </div>
      </section>
    )
  }
  if (rows.length === 0) return null

  const labelOf = new Map(rows.map((v) => [v.id, `${v.name} ${v.label}`]))

  return (
    <section>
      <SectionHeading
        title="Version history"
        description="A published version never changes. Editing after publishing opens the next version as a draft."
      />
      <ol className="divide-y rounded-lg border bg-card">
        {rows.map((v: ContextVersion) => (
          <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm">
            <History className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <VersionBadge status={v.status} label={v.label} />
            <span className="font-medium">{v.name}</span>
            {v.basedOnId && labelOf.has(v.basedOnId) ? (
              <span className="text-xs text-muted-foreground">
                edited from {labelOf.get(v.basedOnId)}
              </span>
            ) : null}
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              {v.status === 'published'
                ? `${formatExact(v.objectCount)} fact${v.objectCount === 1 ? '' : 's'} · published ${formatRelativeTime(v.publishedAt)}`
                : `in progress · ${v.currentStep ?? 'started'} · edited ${formatRelativeTime(v.updatedAt)}`}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
