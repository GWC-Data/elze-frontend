import { useMemo } from 'react'
import {
  BookOpen,
  Bot,
  Building2,
  Building,
  History,
  KeyRound,
  LayoutDashboard,
  Layers,
  Link2,
  UserCircle,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react'
import { fetchPlatformOverview, listCompanies } from '@/api/platform.api'
import { fetchWorkspaceOverview } from '@/api/workspace.api'
import { listConnections } from '@/api/connection.api'
import { listCompanyPublished } from '@/api/publish.api'
import { useAuth } from '@/context/authContext'
import { useAsync } from '@/hooks/useAsync'
import { usePaths } from '@/hooks/usePaths'
import { Page, PageHeader } from '@/components/common/Page'
import { StatCard } from '@/components/common/StatCard'
import { LakehouseSection } from '@/components/common/overview-dashboard/LakehouseSection'
import { RecentActivity } from '@/components/common/overview-dashboard/RecentActivity'
import {
  AttentionPanel,
  KpiGrid,
  Panel,
  PanelEmpty,
  PanelGrid,
  PanelList,
  PanelRow,
  QuickActions,
  type AttentionItem,
  type QuickAction,
} from '@/components/common/overview-dashboard/Panels'
import { lakehouseAttention, publishedContexts } from '@/lib/lakehouseStats'
import type { Company } from '@/types/admin'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function useLakehouse(enabled: boolean) {
  const connections = useAsync(() => (enabled ? listConnections() : Promise.resolve([])), [enabled])
  const published = useAsync(
    () => (enabled ? listCompanyPublished({ page: 1, pageSize: 50 }) : Promise.resolve(null)),
    [enabled]
  )
  const contexts = useMemo(() => publishedContexts(published.data), [published.data])
  const attention = useMemo(() => lakehouseAttention(connections.data ?? []), [connections.data])
  return {
    connections: connections.data,
    contexts,
    attention,
    loading: connections.loading || published.loading,
    error: Boolean(published.error),
  }
}

export default function OverviewPage() {
  const { user } = useAuth()
  const paths = usePaths()
  const name = user?.displayName || user?.username || ''

  const view =
    paths.shell === 'platform' ? <PlatformOverview /> : user?.role === 'COMPANY_ADMIN' ? <CompanyAdminOverview /> : <UserOverview />

  const description =
    paths.shell === 'platform'
      ? 'Your customers, their dashboards and their Metadata Lakehouse, at a glance.'
      : user?.companyName
        ? `What’s happening in ${user.companyName}.`
        : 'What’s happening in your workspace.'

  return (
    <Page>
      <PageHeader title={`${greeting()}${name ? `, ${name}` : ''}`} description={description} />
      {view}
    </Page>
  )
}

function PlatformOverview() {
  const { can } = useAuth()
  const paths = usePaths()
  const overview = useAsync(fetchPlatformOverview, [])
  const companies = useAsync(() => listCompanies({ page: 1, pageSize: 100, sort: 'name', dir: 'asc' }), [])
  const lakehouse = useLakehouse(can('context.read'))

  const companyList: Company[] = companies.data?.items ?? []
  const adopting = useMemo(
    () => new Set((lakehouse.connections ?? []).map((c) => c.companyId)).size,
    [lakehouse.connections]
  )

  const o = overview.data
  const kpiLoading = overview.loading
  const companiesPath = paths.companies ?? paths.overview

  const attention: AttentionItem[] = []
  for (const company of companyList) {
    if (!company.active) {
      attention.push({
        key: `inactive-${company.id}`,
        title: `${company.name} is inactive`,
        meta: 'Its people can’t sign in until it is reactivated',
        to: paths.company(company.id) ?? undefined,
      })
    } else if (company.dashboardCount === 0) {
      attention.push({
        key: `nodash-${company.id}`,
        title: `${company.name} has no dashboards`,
        meta: 'Assign one so its people have something to open',
        to: paths.company(company.id) ?? undefined,
      })
    }
  }
  for (const item of lakehouse.attention) {
    if (item.kind === 'invalid') {
      attention.push({
        key: `conn-${item.connectionId}`,
        title: `${item.connectionName}: connection failing`,
        meta: item.detail,
        to: paths.metadataLakehouseConnection(item.connectionId),
        tone: 'danger',
      })
    }
  }

  const actions: QuickAction[] = [
    { label: 'Add a company', to: companiesPath, icon: Building2 },
    { label: 'Assign dashboards', to: companiesPath, icon: LayoutDashboard },
    ...(can('context.read') ? [{ label: 'Open Lakehouse', to: paths.metadataLakehouse, icon: Layers }] : []),
    { label: 'Audit log', to: paths.audit, icon: History },
  ]

  return (
    <>
      <KpiGrid>
        <StatCard
          label="On the Lakehouse"
          value={can('context.read') && !lakehouse.loading ? adopting : null}
          loading={lakehouse.loading}
          icon={Layers}
          to={paths.metadataLakehouse}
          hint={o ? `of ${o.companies} companies have a connection` : undefined}
        />
        <StatCard
          label="Dashboards"
          value={o?.dashboards ?? null}
          loading={kpiLoading}
          icon={LayoutDashboard}
          to={paths.dashboards}
          hint="In the catalogue"
        />
        <StatCard
          label="Companies"
          value={o?.companies ?? null}
          loading={kpiLoading}
          icon={Building2}
          to={companiesPath}
          hint={o ? `${o.companiesActive} active · ${o.companiesInactive} inactive` : undefined}
        />
        <StatCard
          label="Active companies"
          value={o?.companiesActive ?? null}
          loading={kpiLoading}
          icon={Building}
          to={companiesPath}
          hint={o && o.companies ? `${Math.round((o.companiesActive / o.companies) * 100)}% of all companies` : undefined}
        />
        <StatCard
          label="Dashboard assignments"
          value={o?.assignments ?? null}
          loading={kpiLoading}
          icon={Link2}
          to={companiesPath}
          hint="Dashboards given to companies"
        />
      </KpiGrid>

      <LakehouseSection
        platform
        enabled={can('context.read')}
        contexts={lakehouse.contexts}
        loading={lakehouse.loading}
        error={lakehouse.error}
      />

      <div className="mt-5">
        <PanelGrid>
          <AttentionPanel items={attention.slice(0, 6)} loading={companies.loading} />
          <RecentActivity to={paths.audit} description="Metadata Lakehouse changes across every customer" />
        </PanelGrid>
      </div>

      <QuickActions actions={actions} />
    </>
  )
}

function CompanyAdminOverview() {
  const { can, dashboards } = useAuth()
  const paths = usePaths()
  const overview = useAsync(fetchWorkspaceOverview, [])
  const lakehouse = useLakehouse(can('context.read'))
  const o = overview.data

  const attention: AttentionItem[] = []
  if (o && o.usersPending > 0 && can('user.read')) {
    attention.push({
      key: 'pending',
      title: `${o.usersPending} ${o.usersPending === 1 ? 'person hasn’t' : 'people haven’t'} accepted their invitation`,
      meta: 'Resend the activation email from Members',
      to: paths.users,
    })
  }
  for (const item of lakehouse.attention) {
    attention.push({
      key: `${item.kind}-${item.connectionId}`,
      title: item.connectionName,
      meta: item.detail,
      to:
        item.kind === 'draft'
          ? paths.metadataLakehouseBuilder(item.connectionId)
          : paths.metadataLakehouseConnection(item.connectionId),
      tone: item.kind === 'invalid' ? 'danger' : 'warning',
    })
  }

  const actions: QuickAction[] = [
    ...(can('user.read') ? [{ label: 'Invite a member', to: paths.users, icon: UserPlus }] : []),
    ...(can('group.read') ? [{ label: 'Manage groups', to: paths.groups, icon: UsersRound }] : []),
    ...(can('access.read') && paths.access ? [{ label: 'Dashboard access', to: paths.access, icon: KeyRound }] : []),
    ...(can('context.read') ? [{ label: 'Open Lakehouse', to: paths.metadataLakehouse, icon: Layers }] : []),
  ]

  return (
    <>
      <KpiGrid>
        {can('context.read') && (
          <StatCard
            label="Published contexts"
            value={lakehouse.loading ? null : lakehouse.contexts.length}
            loading={lakehouse.loading}
            icon={Layers}
            to={paths.metadataLakehouse}
            hint="Ready for the agents"
          />
        )}
        <StatCard
          label="Dashboards"
          value={o?.dashboards ?? null}
          loading={overview.loading}
          icon={LayoutDashboard}
          to={paths.dashboards}
          hint={o ? `${o.dashboardsGranted} open to you` : undefined}
        />
        {can('user.read') && (
          <StatCard
            label="Members"
            value={o?.usersActive ?? null}
            loading={overview.loading}
            icon={Users}
            to={paths.users}
            hint={o ? `${o.users} in total` : undefined}
          />
        )}
        {can('user.read') && (
          <StatCard
            label="Pending invites"
            value={o?.usersPending ?? null}
            loading={overview.loading}
            icon={UserPlus}
            to={paths.users}
            hint="Not yet activated"
          />
        )}
        {can('group.read') && (
          <StatCard
            label="Groups"
            value={o?.groupsActive ?? null}
            loading={overview.loading}
            icon={UsersRound}
            to={paths.groups}
            hint={o ? `${o.groups} in total` : undefined}
          />
        )}
      </KpiGrid>

      <LakehouseSection
        enabled={can('context.read')}
        contexts={lakehouse.contexts}
        loading={lakehouse.loading}
        error={lakehouse.error}
      />

      <div className="mt-5">
        <PanelGrid>
          <AttentionPanel items={attention.slice(0, 6)} loading={overview.loading} />
          <DashboardsPanel dashboards={dashboards} />
        </PanelGrid>
      </div>

      <div className="mt-5">
        <PanelGrid>
          <RecentActivity to={paths.audit} description="Metadata Lakehouse changes in your company" />
          <QuickActionsPanel actions={actions} />
        </PanelGrid>
      </div>
    </>
  )
}

function UserOverview() {
  const { can, dashboards } = useAuth()
  const paths = usePaths()
  const lakehouse = useLakehouse(can('context.read'))

  const actions: QuickAction[] = [
    { label: 'Ask the Data analyst', to: paths.dataAnalyst(), icon: Bot },
    { label: 'Playbooks', to: paths.playbooks(), icon: BookOpen },
    ...(can('dashboard.read') ? [{ label: 'Dashboards', to: paths.dashboards, icon: LayoutDashboard }] : []),
    { label: 'Your account', to: paths.profile, icon: UserCircle },
  ]

  return (
    <>
      <KpiGrid>
        <StatCard
          label="My dashboards"
          value={dashboards.length}
          icon={LayoutDashboard}
          to={paths.dashboards}
          hint="Shared with you"
        />
        {can('context.read') && (
          <StatCard
            label="Published contexts"
            value={lakehouse.loading ? null : lakehouse.contexts.length}
            loading={lakehouse.loading}
            icon={Layers}
            to={paths.metadataLakehouse}
            hint="Business context the agents use"
          />
        )}
      </KpiGrid>

      <LakehouseSection
        enabled={can('context.read')}
        contexts={lakehouse.contexts}
        loading={lakehouse.loading}
        error={lakehouse.error}
      />

      <div className="mt-5">
        <PanelGrid>
          <DashboardsPanel dashboards={dashboards} />
        </PanelGrid>
      </div>

      <div className="mt-5">
        <PanelGrid>
          <RecentActivity to={paths.audit} description="Your Metadata Lakehouse changes" />
          <QuickActionsPanel actions={actions} />
        </PanelGrid>
      </div>
    </>
  )
}

function DashboardsPanel({ dashboards }: { dashboards: { id: string; title?: string; accessLevel: string }[] }) {
  const paths = usePaths()
  return (
    <Panel title="Your dashboards" to={paths.dashboards}>
      {dashboards.length === 0 ? (
        <PanelEmpty>No dashboards have been shared with you yet.</PanelEmpty>
      ) : (
        <PanelList>
          {dashboards.slice(0, 5).map((d) => (
            <PanelRow
              key={d.id}
              icon={LayoutDashboard}
              title={d.title || d.id}
              meta={`${d.accessLevel} access`}
              to={paths.dashboard(d.id)}
            />
          ))}
        </PanelList>
      )}
    </Panel>
  )
}

function QuickActionsPanel({ actions }: { actions: QuickAction[] }) {
  return (
    <Panel title="Quick actions">
      <PanelList>
        {actions.map((action) => (
          <PanelRow key={action.label} icon={action.icon} title={action.label} to={action.to} />
        ))}
      </PanelList>
    </Panel>
  )
}
