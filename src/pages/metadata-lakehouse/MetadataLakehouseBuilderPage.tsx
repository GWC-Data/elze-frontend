import { Suspense, lazy, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Eye, GitBranchPlus, Loader2, Pencil, Share2 } from 'lucide-react'
import { useAuth } from '@/context/authContext'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/button'
import { Page } from '@/components/common/Page'
import { usePaths } from '@/hooks/usePaths'
import { ContextQueryProvider } from '@/context/QueryProvider'
import { WorkflowProvider } from '@/context/WorkflowProvider'
import { useWorkflow } from '@/context/workflowContext'
import { Stepper } from '@/components/common/metadata-lakehouse/Stepper'
import { CardSkeleton, TileSkeleton } from '@/components/common/metadata-lakehouse/DataStates'
import { Skeleton } from '@/components/ui/skeleton'
import { VersionBadge } from '@/components/common/metadata-lakehouse/VersionBadge'
import { ContextShareDialog } from '@/components/common/metadata-lakehouse/ContextShareDialog'
import { accessAtLeast } from '@/lib/contextAccess'
import { formatRelativeTime } from '@/lib/format'
import { useConnection, useContextVersions, useCreateVersion, useTrackStep } from '@/hooks/useMetadataLakehouse'
import type { WorkflowStepId } from '@/types/metadataLakehouse'

const ConnectStep = lazy(() =>
  import('@/components/common/metadata-lakehouse/steps/ConnectStep').then((m) => ({ default: m.ConnectStep }))
)
const ContextStep = lazy(() =>
  import('@/components/common/metadata-lakehouse/steps/ContextStep').then((m) => ({ default: m.ContextStep }))
)
const DiscoverStep = lazy(() =>
  import('@/components/common/metadata-lakehouse/steps/DiscoverStep').then((m) => ({ default: m.DiscoverStep }))
)
const ProfileStep = lazy(() =>
  import('@/components/common/metadata-lakehouse/steps/ProfileStep').then((m) => ({ default: m.ProfileStep }))
)
const UnderstandStep = lazy(() =>
  import('@/components/common/metadata-lakehouse/steps/UnderstandStep').then((m) => ({ default: m.UnderstandStep }))
)
const ModelStep = lazy(() =>
  import('@/components/common/metadata-lakehouse/steps/ModelStep').then((m) => ({ default: m.ModelStep }))
)
const ReviewStep = lazy(() =>
  import('@/components/common/metadata-lakehouse/steps/ReviewStep').then((m) => ({ default: m.ReviewStep }))
)
const PublishStep = lazy(() =>
  import('@/components/common/metadata-lakehouse/steps/PublishStep').then((m) => ({ default: m.PublishStep }))
)

export default function MetadataLakehouseBuilderPage() {
  const [params] = useSearchParams()
  const { can } = useAuth()
  const initialConnectionId = params.get('connection')
  const versionId = params.get('version')

  return (
    <ContextQueryProvider>
      <BuilderRoot
        key={`${initialConnectionId ?? ''}:${versionId ?? 'draft'}`}
        connectionId={initialConnectionId}
        versionId={versionId}
        canCreate={can('context.create')}
      />
    </ContextQueryProvider>
  )
}

function BuilderRoot({
  connectionId,
  versionId,
  canCreate,
}: {
  connectionId: string | null
  versionId: string | null
  canCreate: boolean
}) {
  const resuming = Boolean(connectionId && !versionId)
  const versions = useContextVersions(connectionId, resuming)

  if (resuming && versions.isPending) {
    return (
      <Page>
        <StepSkeleton />
      </Page>
    )
  }

  const state = resuming ? versions.data : undefined
  const saved = state?.draft?.currentStep as WorkflowStepId | null | undefined
  const initialStep: WorkflowStepId | undefined = saved && saved !== 'connect' ? saved : undefined
  const initialFurthest: WorkflowStepId | undefined = initialStep
    ? initialStep
    : state?.latestPublished
      ? 'publish'
      : undefined

  return (
    <WorkflowProvider
      initialConnectionId={connectionId}
      versionId={versionId}
      canCreate={canCreate}
      initialStep={initialStep}
      initialFurthest={initialFurthest}
    >
      <BuilderShell />
    </WorkflowProvider>
  )
}

function BuilderShell() {
  const { step, connectionId, versionId, readOnly, access } = useWorkflow()
  const paths = usePaths()
  const { mutate: trackStep } = useTrackStep(connectionId)
  const connection = useConnection(connectionId)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    if (connectionId && !readOnly) trackStep(step)
  }, [connectionId, step, trackStep, readOnly])

  return (
    <Page>
      <div className="flex flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Metadata Lakehouse Builder</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Connect a source, choose datasets, and build the context your agents and dashboards
              read from.
            </p>
            {versionId && connectionId ? (
              <ViewingLine connectionId={connectionId} versionId={versionId} />
            ) : (
              <VersionLine connectionId={connectionId} />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {connectionId && access?.canShare ? (
              <Button variant="outline" size="sm" onClick={() => setSharing(true)}>
                <Share2 className="size-4" aria-hidden />
                Share
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <Link to={paths.metadataLakehouse}>
                <ArrowLeft className="size-4" aria-hidden />
                All connections
              </Link>
            </Button>
          </div>
        </header>

        <ContextShareDialog
          connectionId={connectionId}
          name={connection.data?.name ?? 'this context'}
          open={sharing}
          onOpenChange={setSharing}
        />

        <div className="rounded-xl border bg-card">
          <div className="border-b px-6 py-3.5">
            <Stepper />
          </div>

          <div className="flex min-h-[520px] flex-col">
            <Suspense fallback={<StepSkeleton />}>
              {step === 'connect' ? <ConnectStep /> : null}
              {step === 'context' ? <ContextStep /> : null}
              {step === 'discover' ? <DiscoverStep /> : null}
              {step === 'profile' ? <ProfileStep /> : null}
              {step === 'understand' ? <UnderstandStep /> : null}
              {step === 'model' ? <ModelStep /> : null}
              {step === 'review' ? <ReviewStep /> : null}
              {step === 'publish' ? <PublishStep /> : null}
            </Suspense>
          </div>
        </div>
      </div>
    </Page>
  )
}

function ViewingLine({ connectionId, versionId }: { connectionId: string; versionId: string }) {
  const { access } = useWorkflow()
  const navigate = useNavigate()
  const paths = usePaths()
  const versions = useContextVersions(connectionId)
  const create = useCreateVersion(connectionId)
  const viewed = versions.data?.versions.find((v) => v.id === versionId) ?? null
  const draft = versions.data?.draft ?? null
  const latest = versions.data?.latestPublished ?? null
  const live = Boolean(viewed && latest && viewed.id === latest.id)

  const openDraft = async () => {
    try {
      const state = await create.mutateAsync()
      notify.success(
        `${state.draft?.label ?? 'A new version'} opened as a draft.`,
        `${viewed?.label ?? 'The published version'} stays exactly as it is.`
      )
      navigate(paths.metadataLakehouseBuilder(connectionId))
    } catch (err) {
      notify.failure('create a new version', err)
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
        <Eye className="size-3" aria-hidden />
        Read-only
      </span>
      {viewed ? (
        <>
          <VersionBadge status="published" label={viewed.label} />
          <span>
            <strong className="font-medium text-foreground">{viewed.name}</strong>
            {` — published ${formatRelativeTime(viewed.publishedAt)}${live ? ', live' : ', superseded'}. `}
            Every step shows what was stored at publish; nothing is re-run.
          </span>
        </>
      ) : versions.isPending ? null : (
        <span>This published version could not be found.</span>
      )}
      {accessAtLeast(access, 'edit') ? (
        draft ? (
          <Button asChild size="sm" variant="outline" className="h-7">
            <Link to={paths.metadataLakehouseBuilder(connectionId)}>
              <Pencil className="size-3.5" aria-hidden />
              Continue draft {draft.label}
            </Link>
          </Button>
        ) : (
          <Button size="sm" className="h-7" onClick={openDraft} disabled={create.isPending}>
            {create.isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <GitBranchPlus className="size-3.5" aria-hidden />
            )}
            Create new version
          </Button>
        )
      ) : null}
    </div>
  )
}

function VersionLine({ connectionId }: { connectionId: string | null }) {
  const versions = useContextVersions(connectionId)
  const state = versions.data
  if (!state || state.status === 'none') return null

  const { draft, latestPublished } = state
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {draft ? (
        <>
          <VersionBadge status="draft" label={draft.label} />
          <span>
            <strong className="font-medium text-foreground">{draft.name}</strong>
            {latestPublished
              ? ` — editing a new version of published ${latestPublished.label}, which stays live until this is published.`
              : ' — not published yet. Changes are saved as you go.'}
          </span>
        </>
      ) : latestPublished ? (
        <>
          <VersionBadge status="published" label={latestPublished.label} />
          <span>
            <strong className="font-medium text-foreground">{latestPublished.name}</strong>
            {` — published ${formatRelativeTime(latestPublished.publishedAt)}. Any change opens the next version as a draft.`}
          </span>
        </>
      ) : null}
    </div>
  )
}

function StepSkeleton() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading step…</span>
      <div className="space-y-2 border-b px-6 py-4">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-3.5 w-96 max-w-full" />
      </div>
      <div className="space-y-6 px-6 py-6">
        <TileSkeleton count={3} />
        <CardSkeleton rows={6} columns={5} />
      </div>
    </div>
  )
}
