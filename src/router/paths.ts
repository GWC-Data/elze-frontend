import type { RoleName } from '@/types/auth'

export type Shell = 'platform' | 'workspace'

export interface AppPaths {
  readonly shell: Shell

  readonly overview: string
  readonly architecture: string

  readonly dashboards: string
  dashboard(dashboardId: string): string
  readonly data: string

  readonly metadataLakehouse: string
  metadataLakehouseBuilder(connectionId?: string, versionId?: string): string
  metadataLakehouseConnection(connectionId: string): string
  dataAnalyst(connectionId?: string, sessionId?: string): string
  playbooks(connectionId?: string): string
  playbookBuilder(connectionId?: string, sessionId?: string): string
  readonly agentLibrary: string
  // The agent's chat; a session id opens that conversation.
  libraryAgent(agentId: string, sessionId?: string): string
  // No id = the create page.
  libraryAgentEdit(agentId?: string): string

  readonly users: string
  user(userId: number | string): string
  readonly groups: string

  readonly access: string | null
  readonly roles: string | null

  readonly companies: string | null
  company(companyId: number | string): string | null

  readonly audit: string
  readonly settings: string
  readonly companySettings: string | null
  readonly profile: string
}

const PLATFORM: AppPaths = {
  shell: 'platform',
  overview: '/platform',
  architecture: '/platform/architecture',

  dashboards: '/platform/dashboards',
  dashboard: (id) => `/platform/dashboards/${encodeURIComponent(id)}`,
  data: '/platform/data',

  metadataLakehouse: '/platform/metadata-lakehouse',
  metadataLakehouseBuilder: (id, versionId) =>
    id
      ? `/platform/metadata-lakehouse/builder?connection=${encodeURIComponent(id)}${versionId ? `&version=${encodeURIComponent(versionId)}` : ''
      }`
      : '/platform/metadata-lakehouse/builder',
  metadataLakehouseConnection: (id) => `/platform/metadata-lakehouse/connections/${encodeURIComponent(id)}`,
  dataAnalyst: (connectionId, sessionId) =>
    connectionId
      ? `/platform/data-analyst/${encodeURIComponent(connectionId)}${sessionId ? `/${encodeURIComponent(sessionId)}` : ''}`
      : '/platform/data-analyst',
  playbooks: (connectionId) =>
    connectionId ? `/platform/playbooks/${encodeURIComponent(connectionId)}` : '/platform/playbooks',
  playbookBuilder: (connectionId, sessionId) =>
    connectionId
      ? `/platform/playbook-builder/${encodeURIComponent(connectionId)}${sessionId ? `/${encodeURIComponent(sessionId)}` : ''}`
      : '/platform/playbook-builder',
  agentLibrary: '/platform/agents',
  libraryAgent: (id, sessionId) =>
    `/platform/agents/${encodeURIComponent(id)}${sessionId ? `/chat/${encodeURIComponent(sessionId)}` : ''}`,
  libraryAgentEdit: (id) => (id ? `/platform/agents/${encodeURIComponent(id)}/edit` : '/platform/agents/new'),

  users: '/platform/users',
  user: (id) => `/platform/users/${id}`,
  groups: '/platform/groups',

  access: null,
  roles: '/platform/roles',

  companies: '/platform/companies',
  company: (id) => `/platform/companies/${id}`,

  audit: '/platform/audit',
  settings: '/platform/settings',
  companySettings: null,
  profile: '/platform/profile',
}

const WORKSPACE: AppPaths = {
  shell: 'workspace',
  overview: '/workspace',
  architecture: '/architecture',

  dashboards: '/dashboards',
  dashboard: (id) => `/dashboards/${encodeURIComponent(id)}`,
  data: '/data',

  metadataLakehouse: '/metadata-lakehouse',
  metadataLakehouseBuilder: (id, versionId) =>
    id
      ? `/metadata-lakehouse/builder?connection=${encodeURIComponent(id)}${versionId ? `&version=${encodeURIComponent(versionId)}` : ''
      }`
      : '/metadata-lakehouse/builder',
  metadataLakehouseConnection: (id) => `/metadata-lakehouse/connections/${encodeURIComponent(id)}`,
  dataAnalyst: (connectionId, sessionId) =>
    connectionId
      ? `/data-analyst/${encodeURIComponent(connectionId)}${sessionId ? `/${encodeURIComponent(sessionId)}` : ''}`
      : '/data-analyst',
  playbooks: (connectionId) => (connectionId ? `/playbooks/${encodeURIComponent(connectionId)}` : '/playbooks'),
  playbookBuilder: (connectionId, sessionId) =>
    connectionId
      ? `/playbook-builder/${encodeURIComponent(connectionId)}${sessionId ? `/${encodeURIComponent(sessionId)}` : ''}`
      : '/playbook-builder',
  agentLibrary: '/agents',
  libraryAgent: (id, sessionId) =>
    `/agents/${encodeURIComponent(id)}${sessionId ? `/chat/${encodeURIComponent(sessionId)}` : ''}`,
  libraryAgentEdit: (id) => (id ? `/agents/${encodeURIComponent(id)}/edit` : '/agents/new'),

  users: '/team/users',
  user: (id) => `/team/users/${id}`,
  groups: '/team/groups',

  access: '/team/access',
  roles: '/team/roles',

  companies: null,
  company: () => null,

  audit: '/activity',
  settings: '/settings',
  companySettings: '/settings/company',
  profile: '/settings/profile',
}

export function shellForRole(role: RoleName): Shell {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'platform'
    case 'COMPANY_ADMIN':
    case 'USER':
      return 'workspace'
  }
}

export function pathsFor(shell: Shell): AppPaths {
  return shell === 'platform' ? PLATFORM : WORKSPACE
}

export function pathsForRole(role: RoleName): AppPaths {
  return pathsFor(shellForRole(role))
}
