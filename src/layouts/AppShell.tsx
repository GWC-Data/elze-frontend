import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/authContext'
import { shellForRole, type Shell } from '@/router/paths'
import ChangePasswordGate from '@/components/common/auth/ChangePasswordGate'
import { AppSidebar } from '@/layouts/AppSidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import type { AppData } from '@/types/layout'

export function AppShell({ shell }: { shell: Shell }) {
  const { status, user, dashboards, refresh } = useAuth()

  if (status === 'RESTORING') {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Restoring your session…
        </div>
      </div>
    )
  }

  if (status !== 'AUTHENTICATED' && status !== 'PASSWORD_CHANGE_REQUIRED') {
    return <Navigate to="/login" replace />
  }
  if (!user) return <Navigate to="/login" replace />

  if (status === 'PASSWORD_CHANGE_REQUIRED') return <ChangePasswordGate />

  const belongs = shellForRole(user.role)
  if (belongs !== shell) {
    return <Navigate to={belongs === 'platform' ? '/platform' : '/workspace'} replace />
  }

  const context: AppData = { dashboards, reload: refresh }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        <AppSidebar />
        <SidebarInset className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <SidebarTrigger
            className="fixed left-3 top-3 z-30 size-9 rounded-lg border bg-background/90 shadow-sm backdrop-blur md:hidden"
            aria-label="Open navigation"
          />
          <main className="scrollbar-thin min-w-0 flex-1 overflow-y-auto bg-muted/30">
            <Outlet context={context} />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export function PlatformShell() {
  return <AppShell shell="platform" />
}

export function WorkspaceShell() {
  return <AppShell shell="workspace" />
}
