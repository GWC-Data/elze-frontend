import { useEffect, useState } from 'react'
import { Clock, RefreshCw, Share2, ShieldCheck, Trash2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardRenderer from '@/components/common/dashboard/DashboardRenderer'
import { ShareDialog } from '@/components/common/dashboard/ShareDialog'
import { ACCESS_LEVEL_ABILITIES, levelAtLeast } from '@/constants/labels'
import { deleteDashboard, fetchView, patchCard } from '@/api/dashboard.api'
import { errorCode, errorMessage } from '@/api/client'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/hooks/usePaths'
import { buildFilters } from '@/lib/filters'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { AccessLevelBadge } from '@/components/common/Badges'
import { ErrorState, NotFoundState, PermissionDeniedState } from '@/components/common/States'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { HydratedDashboardView, CardDefinition, Selections } from '@/types/dashboard'

export default function DashboardPage() {
  const { dashboardId = '' } = useParams()

  return <DashboardView key={dashboardId} dashboardId={dashboardId} />
}

function DashboardView({ dashboardId }: { dashboardId: string }) {
  const { can, refresh, dashboards } = useAuth()
  const paths = usePaths()
  const navigate = useNavigate()

  const [view, setView] = useState<HydratedDashboardView | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [selections, setSelections] = useState<Selections>({})
  const [lastRun, setLastRun] = useState<string>('')
  const [deleting, setDeleting] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    const onFocus = () => void refresh().catch(() => {})
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])
  const liveLevel = dashboards.find((d) => d.id === dashboardId)?.accessLevel
  const level = liveLevel ?? view?.accessLevel ?? null

  const canEdit = Boolean(view && can('dashboard.update') && levelAtLeast(level, 'developer'))
  const canShare = Boolean(view && levelAtLeast(level, 'share'))
  const canDelete = Boolean(view && can('dashboard.delete') && levelAtLeast(level, 'admin'))

  const syncSelections = (next: HydratedDashboardView) => {
    const selected: Selections = {}
    for (const slicer of next.slicers || []) {
      const values = slicer.options.filter((option) => option.selected).map((option) => option.value)
      if (values.length) selected[slicer.id] = new Set(values)
    }
    setSelections(selected)
  }

  const stamp = () =>
    setLastRun(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))

  useEffect(() => {
    if (!dashboardId) return
    let active = true

    fetchView(dashboardId)
      .then((next) => {
        if (!active) return
        setView(next)
        syncSelections(next)
        stamp()
      })
      .catch((err: unknown) => {
        if (!active) return
        setView(null)
        setError(err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [dashboardId])

  const reload = async (filters: Record<string, string[]>) => {
    setBusy(true)
    try {
      const next = await fetchView(dashboardId, filters)
      setView(next)
      syncSelections(next)
      stamp()
    } catch (err) {
      notify.failure('apply that filter', err)
    } finally {
      setBusy(false)
    }
  }

  const onSlicerChange = (id: string, values: Set<string>) => {
    setSelections((previous) => {
      const next = { ...previous, [id]: values }
      void reload(buildFilters(next))
      return next
    })
  }

  const onCardEdit = async (index: number, card: CardDefinition) => {
    setBusy(true)
    try {
      const next = await patchCard(dashboardId, index, card, buildFilters(selections))
      setView(next)
      syncSelections(next)
      stamp()
      notify.success('Dashboard saved.')
    } catch (err) {
      notify.failure('save the dashboard', err)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setDeletePending(true)
    try {
      await deleteDashboard(dashboardId)
      notify.success('Dashboard deleted.')
      await refresh()
      navigate(paths.dashboards)
    } catch (err) {
      notify.failure('delete dashboard', err)
    } finally {
      setDeletePending(false)
    }
  }

  if (loading) {
    return (
      <Page>
        <Skeleton className="h-7 w-64" />
        <Skeleton className="mt-2 h-4 w-96" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-4 h-80 rounded-xl" />
        <p className="sr-only" role="status">
          Loading the dashboard…
        </p>
      </Page>
    )
  }

  if (error) {
    const code = errorCode(error)

    if (code === 'DASHBOARD_NOT_FOUND' || code === 'TENANT_ACCESS_DENIED') {
      return (
        <Page>
          <NotFoundState
            detail="This dashboard does not exist, or has not been shared with you. An administrator can give you access."
            backTo={paths.dashboards}
          />
        </Page>
      )
    }
    if (code === 'INSUFFICIENT_PERMISSION') {
      return (
        <Page>
          <PermissionDeniedState detail={errorMessage(error, '')} backTo={paths.dashboards} />
        </Page>
      )
    }

    return (
      <Page>
        <PageHeader title="Dashboard" crumbs={[{ label: 'Dashboards', to: paths.dashboards }]} />
        <Section>
          <ErrorState
            error={error}
            title="Unable to load this dashboard"
            onRetry={() => void reload(buildFilters(selections))}
          />
        </Section>
      </Page>
    )
  }

  if (!view) return null

  const title = view.dashboard?.title || dashboardId

  return (
    <div>
      <div className="border-b border-border bg-background px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1600px]">
          <PageHeader
            crumbs={[{ label: 'Dashboards', to: paths.dashboards }, { label: title }]}
            title={
              <span className="flex flex-wrap items-center gap-2.5">
                {title}
                {level ? <AccessLevelBadge level={level} /> : null}
              </span>
            }
            description={view.dashboard?.description}
            actions={
              <>
                {lastRun && (
                  <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                    <Clock className="size-3.5" aria-hidden />
                    Ran at {lastRun}
                  </span>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void reload(buildFilters(selections))}
                  disabled={busy}
                >
                  <RefreshCw className={busy ? 'animate-spin' : undefined} aria-hidden />
                  Refresh
                </Button>

                {canShare && (
                  <Button variant="outline" size="sm" onClick={() => setSharing(true)}>
                    <Share2 aria-hidden />
                    Share
                  </Button>
                )}

                {canDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleting(true)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Delete
                  </Button>
                )}
              </>
            }
          />
          {level ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
              {ACCESS_LEVEL_ABILITIES[level]}
            </p>
          ) : null}
        </div>
      </div>

      {busy && (
        <div
          className="flex items-center justify-center gap-2 border-b border-border bg-accent/40 py-1.5 text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <RefreshCw className="size-3 animate-spin" aria-hidden />
          Running queries…
        </div>
      )}

      <DashboardRenderer
        dashboardId={dashboardId}
        view={view}
        selections={selections}
        canEdit={canEdit}
        onSlicerChange={onSlicerChange}
        onClearAll={() => {
          setSelections({})
          void reload({})
        }}
        onCardEdit={onCardEdit}
      />

      <ShareDialog
        dashboardId={dashboardId}
        dashboardTitle={title}
        open={sharing}
        onOpenChange={setSharing}
        accessPagePath={can('access.grant') ? paths.access : null}
      />

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete "${title}"?`}
        body="Are you sure you want to delete this dashboard? This cannot be undone."
        consequence="All cards, custom configurations, and user access grants for this dashboard will be permanently deleted."
        confirmLabel="Delete Dashboard"
        destructive
        pending={deletePending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
