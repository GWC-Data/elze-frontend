import { lazy, Suspense } from 'react'
import type { ComponentType, LazyExoticComponent, ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PlatformShell, WorkspaceShell } from '@/layouts/AppShell'
import { InlineLoading } from '@/components/common/States'
import { LegacyContextRedirect, LoginRoute, RequirePermission, RootRedirect } from '@/router/guards'

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const ActivatePage = lazy(() => import('@/pages/ActivatePage'))
const OverviewPage = lazy(() => import('@/pages/OverviewPage'))
const ArchitecturePage = lazy(() => import('@/pages/ArchitecturePage'))
const AuditLogPage = lazy(() => import('@/pages/AuditLogPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const DashboardsPage = lazy(() => import('@/pages/DashboardsPage'))
const DataPage = lazy(() => import('@/pages/DataPage'))
const PeoplePage = lazy(() => import('@/pages/PeoplePage'))
const PersonPage = lazy(() => import('@/pages/PersonPage'))
const CompaniesPage = lazy(() => import('@/pages/platform/CompaniesPage'))
const CompanyDetailPage = lazy(() => import('@/pages/platform/CompanyDetailPage'))
const RolesPage = lazy(() => import('@/pages/platform/RolesPage'))
const PlatformSettingsPage = lazy(() => import('@/pages/platform/PlatformSettingsPage'))
const GroupsPage = lazy(() => import('@/pages/workspace/GroupsPage'))
const CompanyRolesPage = lazy(() => import('@/pages/workspace/CompanyRolesPage'))
const AccessPage = lazy(() => import('@/pages/workspace/AccessPage'))
const CompanySettingsPage = lazy(() => import('@/pages/workspace/CompanySettingsPage'))
const MetadataLakehousePage = lazy(() => import('@/pages/metadata-lakehouse/MetadataLakehousePage'))
const MetadataLakehouseBuilderPage = lazy(() => import('@/pages/metadata-lakehouse/MetadataLakehouseBuilderPage'))
const ConnectionDatasetsPage = lazy(() => import('@/pages/metadata-lakehouse/ConnectionDatasetsPage'))
const DataAnalystPage = lazy(() => import('@/pages/agent/DataAnalystPage'))
const PlaybookBuilderPage = lazy(() => import('@/pages/agent/PlaybookBuilderPage'))
const PlaybooksPage = lazy(() => import('@/pages/agent/PlaybooksPage'))
const AgentLibraryPage = lazy(() => import('@/pages/agent/AgentLibraryPage'))
const LibraryAgentPage = lazy(() => import('@/pages/agent/LibraryAgentPage'))
const LibraryAgentChatPage = lazy(() => import('@/pages/agent/LibraryAgentChatPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

const pageFallback = <InlineLoading label="Loading…" />

// `permission`: one id, or a list meaning "any of these".
function page<P extends object>(
  Component: LazyExoticComponent<ComponentType<P>>,
  props?: P,
  permission?: string | string[]
) {
  const element = (
    <Suspense fallback={pageFallback}>
      <Component {...(props as P)} />
    </Suspense>
  )
  return permission ? <RequirePermission permission={permission}>{element}</RequirePermission> : element
}

interface RouteDef {
  path: string
  element: ReactElement
}

function sharedRoutes(prefix: string): RouteDef[] {
  return [
    { path: `${prefix}architecture`, element: page(ArchitecturePage) },
    { path: `${prefix}dashboards`, element: page(DashboardsPage, {}, 'dashboard.read') },
    { path: `${prefix}dashboards/:dashboardId`, element: page(DashboardPage, {}, 'dashboard.read') },
    { path: `${prefix}data`, element: page(DataPage, {}, 'data.read') },
    { path: `${prefix}metadata-lakehouse`, element: page(MetadataLakehousePage, {}, 'context.read') },
    { path: `${prefix}metadata-lakehouse/builder`, element: page(MetadataLakehouseBuilderPage, {}, 'context.read') },
    { path: `${prefix}metadata-lakehouse/connections/:id`, element: page(ConnectionDatasetsPage, {}, 'context.read') },
    { path: `${prefix}context/*`, element: <LegacyContextRedirect /> },
    // Playbooks → Analyse opens a data-analyst chat, so playbook.run reaches it too.
    { path: `${prefix}data-analyst`, element: page(DataAnalystPage, {}, ['analyst.use', 'playbook.run']) },
    { path: `${prefix}data-analyst/:connectionId/:sessionId?`, element: page(DataAnalystPage, {}, ['analyst.use', 'playbook.run']) },
    // Building a new playbook and editing/publishing a draft both happen in the builder.
    { path: `${prefix}playbook-builder/:connectionId/:sessionId?`, element: page(PlaybookBuilderPage, {}, ['playbook.create', 'playbook.update']) },
    { path: `${prefix}playbooks`, element: page(PlaybooksPage, {}, 'playbook.read') },
    { path: `${prefix}playbooks/:connectionId`, element: page(PlaybooksPage, {}, 'playbook.read') },
    { path: `${prefix}agents`, element: page(AgentLibraryPage, {}, 'agent.read') },
    { path: `${prefix}agents/new`, element: page(LibraryAgentPage, {}, 'agent.create') },
    { path: `${prefix}agents/:agentId/edit`, element: page(LibraryAgentPage, {}, 'agent.update') },
    { path: `${prefix}agents/:agentId`, element: page(LibraryAgentChatPage, {}, 'agent.read') },
    { path: `${prefix}agents/:agentId/chat/:sessionId`, element: page(LibraryAgentChatPage, {}, 'agent.read') },
  ]
}

const platformRoutes: RouteDef[] = [
  { path: 'companies', element: page(CompaniesPage, {}, 'company.read') },
  { path: 'companies/:companyId', element: page(CompanyDetailPage, {}, 'company.read') },
  { path: 'users', element: page(PeoplePage, { scope: 'platform' }, 'user.read') },
  { path: 'users/:userId', element: page(PersonPage, { scope: 'platform' }, 'user.read') },
  ...sharedRoutes(''),
  { path: 'roles', element: page(RolesPage, {}, 'role.read') },
  { path: 'groups', element: page(GroupsPage, {}, 'group.read') },
  { path: 'audit', element: page(AuditLogPage) },
  { path: 'settings', element: page(PlatformSettingsPage) },
  { path: 'profile', element: page(ProfilePage) },
]

const workspaceRoutes: RouteDef[] = [
  { path: '/workspace', element: page(OverviewPage) },
  ...sharedRoutes('/'),
  { path: '/team/users', element: page(PeoplePage, { scope: 'team' }, 'user.read') },
  { path: '/team/users/:userId', element: page(PersonPage, { scope: 'team' }, 'user.read') },
  { path: '/team/groups', element: page(GroupsPage, {}, 'group.read') },
  { path: '/team/roles', element: page(CompanyRolesPage, {}, 'role.read') },
  { path: '/team/access', element: page(AccessPage, {}, 'access.read') },
  { path: '/activity', element: page(AuditLogPage) },
  { path: '/settings', element: <Navigate to="/settings/profile" replace /> },
  { path: '/settings/company', element: page(CompanySettingsPage, {}, 'company.read') },
  { path: '/settings/profile', element: page(ProfilePage) },
]

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute>{page(LoginPage)}</LoginRoute>} />
      <Route path="/activate" element={page(ActivatePage)} />
      <Route path="/" element={<RootRedirect />} />

      <Route path="/platform" element={<PlatformShell />}>
        <Route index element={page(OverviewPage)} />
        {platformRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        <Route path="*" element={page(NotFoundPage)} />
      </Route>

      <Route element={<WorkspaceShell />}>
        {workspaceRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        <Route path="*" element={page(NotFoundPage)} />
      </Route>
    </Routes>
  )
}
