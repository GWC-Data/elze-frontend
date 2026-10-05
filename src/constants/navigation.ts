import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Bot,
  BookOpen,
  BrainCircuit,
  Building2,
  Database,
  KeyRound,
  LayoutDashboard,
  Layers,
  Home,
  Network,
  History,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserCircle,
  Users,
  UsersRound,
} from 'lucide-react'
import type { AppPaths } from '@/router/paths'

// A sidebar item appears when its `permission` is held. The server already removes the
// permissions of features the company does not have (backend constants/features.ts), so the
// platform owner's feature toggles and the company admin's roles are both answered by `can`.
import type { RoleName } from '@/types/auth'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  permission?: string
  exact?: boolean
}

export interface NavGroup {
  title: string | null
  items: NavItem[]
}

function visible(groups: NavGroup[], can: (permission: string) => boolean): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || can(item.permission)),
    }))
    .filter((group) => group.items.length > 0)
}

function platformGroups(paths: AppPaths): NavGroup[] {
  return [
    {
      title: null,
      items: [
        { label: 'Overview', path: paths.overview, icon: Home, exact: true },
        { label: 'Architecture', path: paths.architecture, icon: Network },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { label: 'Metadata Lakehouse', path: paths.metadataLakehouse, icon: Layers, permission: 'context.read' },
        { label: 'Data analyst', path: paths.dataAnalyst(), icon: Bot, permission: 'analyst.use' },
        { label: 'Playbooks', path: paths.playbooks(), icon: BookOpen, permission: 'playbook.read' },
        { label: 'Agents', path: paths.agentLibrary, icon: BrainCircuit, permission: 'agent.read' },
      ],
    },
    {
      title: 'Product',
      items: [
        { label: 'Dashboards', path: paths.dashboards, icon: LayoutDashboard, permission: 'dashboard.read' },
        { label: 'Data sources', path: paths.data, icon: Database, permission: 'data.read' },
      ],
    },
    {
      title: 'Customers',
      items: [
        { label: 'Companies', path: paths.companies!, icon: Building2, permission: 'company.read' },
        { label: 'Users', path: paths.users, icon: Users, permission: 'user.read' },
      ],
    },
    {
      title: 'Access',
      items: [
        { label: 'Roles', path: paths.roles!, icon: ShieldCheck, permission: 'role.read' },
        { label: 'Groups', path: paths.groups, icon: UsersRound, permission: 'group.read' },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Audit log', path: paths.audit, icon: Activity },
      ],
    },
  ]
}

function workspaceGroups(paths: AppPaths, role?: RoleName): NavGroup[] {
  return [
    {
      title: null,
      items: [
        { label: 'Overview', path: paths.overview, icon: Home, exact: true },
        { label: 'Architecture', path: paths.architecture, icon: Network },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { label: 'Metadata Lakehouse', path: paths.metadataLakehouse, icon: Layers, permission: 'context.read' },
        { label: 'Data analyst', path: paths.dataAnalyst(), icon: Bot, permission: 'analyst.use' },
        { label: 'Playbooks', path: paths.playbooks(), icon: BookOpen, permission: 'playbook.read' },
        { label: 'Agents', path: paths.agentLibrary, icon: BrainCircuit, permission: 'agent.read' },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Dashboards', path: paths.dashboards, icon: LayoutDashboard, permission: 'dashboard.read' },
        { label: 'Data sources', path: paths.data, icon: Database, permission: 'data.read' },
      ],
    },
    {
      title: 'Team',
      items: [
        { label: 'Members', path: paths.users, icon: Users, permission: 'user.read' },
        { label: 'Roles', path: paths.roles!, icon: ShieldCheck, permission: 'role.read' },
        { label: 'Groups', path: paths.groups, icon: UsersRound, permission: 'group.read' },
        { label: 'Dashboard access', path: paths.access!, icon: KeyRound, permission: 'access.read' },
      ],
    },
    {
      title: 'Activity',
      items: [
        // Same page for both: the server scopes it to the company for an admin, to the account otherwise.
        { label: role === 'COMPANY_ADMIN' ? 'Audit log' : 'My activity', path: paths.audit, icon: History },
      ],
    },
  ]
}

export function accountMenuFor(paths: AppPaths, can: (permission: string) => boolean): NavItem[] {
  const items: NavItem[] =
    paths.shell === 'platform'
      ? [
          { label: 'Settings', path: paths.settings, icon: Settings },
          { label: 'Your account', path: paths.profile, icon: UserCircle },
        ]
      : [
          {
            label: 'Company settings',
            path: paths.companySettings!,
            icon: SlidersHorizontal,
            permission: 'company.read',
          },
          { label: 'Your account', path: paths.profile, icon: UserCircle },
        ]
  return items.filter((item) => item.path && (!item.permission || can(item.permission)))
}

export function navigationFor(
  paths: AppPaths,
  can: (permission: string) => boolean,
  role?: RoleName
): NavGroup[] {
  return visible(paths.shell === 'platform' ? platformGroups(paths) : workspaceGroups(paths, role), can)
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.path
  return pathname === item.path || pathname.startsWith(`${item.path}/`)
}
