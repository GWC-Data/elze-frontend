import type { ComponentType } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bot, ChevronRight, Home, LayoutDashboard, Network } from 'lucide-react'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/hooks/usePaths'
import { Page } from '@/components/common/Page'
import { ElzeMark } from '@/components/common/ElzeMark'
import { Button } from '@/components/ui/button'

interface Destination {
  label: string
  description: string
  to: string
  icon: ComponentType<{ className?: string }>
  permission?: string
}

export default function NotFoundPage() {
  const { can } = useAuth()
  const paths = usePaths()
  const location = useLocation()
  const navigate = useNavigate()

  // React Router stores the history index in `window.history.state.idx`; 0 means this is the
  // first entry of the tab (e.g. a pasted link), where "back" would leave the app entirely.
  const canGoBack = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0

  const destinations: Destination[] = [
    { label: 'Overview', description: 'Your home screen', to: paths.overview, icon: Home },
    { label: 'Dashboards', description: 'Browse BI dashboards', to: paths.dashboards, icon: LayoutDashboard },
    { label: 'Data analyst', description: 'Ask questions of your data', to: paths.dataAnalyst(), icon: Bot },
    {
      label: 'Metadata Lakehouse',
      description: 'Connections and semantic models',
      to: paths.metadataLakehouse,
      icon: Network,
      permission: 'context.read',
    },
  ]
  const visible = destinations.filter((d) => !d.permission || can(d.permission))

  return (
    <Page className="flex min-h-full items-center justify-center py-16">
      <div className="w-full max-w-lg text-center">
        <ElzeMark className="mx-auto size-11" title="Elze" />

        <p
          className="mt-6 bg-linear-to-br from-[#4F46E5] to-[#06B6D4] bg-clip-text text-7xl font-semibold tracking-tight text-transparent"
          aria-hidden
        >
          404
        </p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">Page not found</h1>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          There is nothing at this address. It may have been moved, removed, or the link may be
          mistyped.
        </p>
        <p className="mx-auto mt-3 inline-block max-w-full truncate rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
          {location.pathname}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {canGoBack && (
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft aria-hidden />
              Go back
            </Button>
          )}
          <Button asChild>
            <Link to={paths.overview}>
              <Home aria-hidden />
              Go to overview
            </Link>
          </Button>
        </div>

        <nav
          aria-label="Suggested pages"
          className="mt-10 overflow-hidden rounded-xl border border-border bg-card text-left"
        >
          <p className="border-b border-border px-5 py-3 text-xs font-medium text-muted-foreground">
            Or jump to
          </p>
          <ul className="divide-y divide-border">
            {visible.map(({ label, description, to, icon: Icon }) => (
              <li key={label}>
                <Link
                  to={to}
                  className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-card-foreground">{label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{description}</span>
                  </span>
                  <ChevronRight
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </Page>
  )
}
