import type { AdkAgentName } from '@/types/adk'

const enc = encodeURIComponent

const connectionPath = (id: string) => `/context/connections/${enc(id)}`

const ADK_AGENT_PATHS: Record<AdkAgentName, string> = {
  data_analyst: 'data-analyst',
  context_layer_extractor: 'context-layer',
  description_editor: 'description-editor',
  playbook_builder: 'playbook-builder',
}

const adkSessionsPath = (contextId: string, agentName: AdkAgentName) =>
  `/contexts/${enc(contextId)}/${ADK_AGENT_PATHS[agentName]}/sessions`

export const endpoints = {
  health: '/health',

  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
    sessions: '/auth/sessions',
    changePassword: '/auth/change-password',
    activation: '/auth/activation',
  },

  dashboard: {
    root: '/dashboard',
    one: (dashboardId: string) => `/dashboard/${enc(dashboardId)}`,
    config: (dashboardId: string) => `/dashboard/${enc(dashboardId)}/config`,
    columns: '/dashboard/columns',
    preview: '/dashboard/preview',
  },

  platform: {
    companies: '/platform/companies',
    companyOptions: '/platform/companies/options',
    company: (id: number) => `/platform/companies/${id}`,
    companyDashboards: (companyId: number) => `/platform/companies/${companyId}/dashboards`,
    companyDashboard: (companyId: number, dashboardId: string) =>
      `/platform/companies/${companyId}/dashboards/${enc(dashboardId)}`,
    users: '/platform/users',
    roles: '/platform/roles',
    permissions: '/platform/roles/permissions',
    rolePermissions: (name: string) => `/platform/roles/${enc(name)}/permissions`,
    settings: '/platform/settings',
    overview: '/platform/overview',
    features: '/platform/features',
    companyFeatures: (companyId: number) => `/platform/companies/${companyId}/features`,
  },

  workspace: {
    company: '/workspace/company',
    overview: '/workspace/overview',
  },

  audit: '/audit',

  companyRoles: {
    root: '/roles',
    permissions: '/roles/permissions',
    one: (id: number) => `/roles/${id}`,
    builtIn: (name: string) => `/roles/built-in/${enc(name)}`,
  },

  users: {
    root: '/users',
    options: '/users/options',
    scopeOptions: '/users/scope-options',
    access: (id: number) => `/users/${id}/access`,
    scope: (id: number) => `/users/${id}/scope`,
  },

  person: {
    one: (base: string, id: number) => `${base}/${id}`,
    deactivate: (base: string, id: number) => `${base}/${id}/deactivate`,
    activate: (base: string, id: number) => `${base}/${id}/activate`,
    activation: (base: string, id: number) => `${base}/${id}/activation`,
  },

  groups: {
    root: '/groups',
    one: (id: number) => `/groups/${id}`,
  },

  access: {
    levels: '/access/levels',
    grantable: '/access/dashboards/grantable',
    grants: (dashboardId: string) => `/access/dashboards/${enc(dashboardId)}/grants`,
    people: (dashboardId: string) => `/access/dashboards/${enc(dashboardId)}/people`,
    user: (dashboardId: string, userId: number) => `/access/dashboards/${enc(dashboardId)}/users/${userId}`,
    group: (dashboardId: string, groupId: number) =>
      `/access/dashboards/${enc(dashboardId)}/groups/${groupId}`,
    groupDashboards: (groupId: number) => `/access/groups/${groupId}/dashboards`,
  },

  context: {
    connectors: () => '/context/connectors',
    connections: () => '/context/connections',
    companyPublished: () => '/context/published-versions',
    publishedConnections: () => '/context/published-connections',
    publishedContexts: () => '/context/published-contexts',
    connection: (id: string) => connectionPath(id),
    contextProfile: (id: string) => `${connectionPath(id)}/context`,
    verifyConnection: (id: string) => `${connectionPath(id)}/verify`,
    datasets: (id: string) => `${connectionPath(id)}/datasets`,
    profileOverview: (id: string) => `${connectionPath(id)}/profile`,
    tableProfile: (id: string, tableId: string) => `${connectionPath(id)}/tables/${enc(tableId)}`,
    versions: (id: string) => `${connectionPath(id)}/versions`,
    version: (id: string, versionId: string) => `${connectionPath(id)}/versions/${enc(versionId)}`,
    draft: (id: string) => `${connectionPath(id)}/draft`,
    extraction: (id: string) => `${connectionPath(id)}/extraction`,
    understanding: (id: string) => `${connectionPath(id)}/understanding`,
    contextObjects: (id: string) => `${connectionPath(id)}/context-objects`,
    factsByTable: (id: string) => `${connectionPath(id)}/context-objects/by-table`,
    model: (id: string) => `${connectionPath(id)}/model`,
    reviewQueue: (id: string) => `${connectionPath(id)}/review`,
    reviewItem: (id: string, itemId: string) => `${connectionPath(id)}/review/${enc(itemId)}`,
    reviewItemDecision: (id: string, itemId: string) => `${connectionPath(id)}/review/${enc(itemId)}/decision`,
    reviewBulkDecision: (id: string) => `${connectionPath(id)}/review/decision`,
    publishSummary: (id: string) => `${connectionPath(id)}/publish/summary`,
    publishValidate: (id: string) => `${connectionPath(id)}/publish/validate`,
    publish: (id: string) => `${connectionPath(id)}/publish`,
    access: (id: string) => `${connectionPath(id)}/access`,
    accessPeople: (id: string) => `${connectionPath(id)}/access/people`,
    accessGeneral: (id: string) => `${connectionPath(id)}/access/general`,
    accessUser: (id: string, userId: number) => `${connectionPath(id)}/access/users/${userId}`,
  },

  adk: {
    health: '/health',
    models: '/models',

    sessions: (contextId: string, agentName: AdkAgentName) => adkSessionsPath(contextId, agentName),
    session: (contextId: string, agentName: AdkAgentName, sessionId: string) =>
      `${adkSessionsPath(contextId, agentName)}/${enc(sessionId)}`,
    messages: (contextId: string, agentName: AdkAgentName, sessionId: string) =>
      `${adkSessionsPath(contextId, agentName)}/${enc(sessionId)}/messages`,
    usage: (contextId: string, agentName: AdkAgentName, sessionId: string) =>
      `${adkSessionsPath(contextId, agentName)}/${enc(sessionId)}/usage`,
    interrupt: (contextId: string, agentName: AdkAgentName, sessionId: string) =>
      `${adkSessionsPath(contextId, agentName)}/${enc(sessionId)}/interrupt`,
    artifacts: (contextId: string, agentName: AdkAgentName, sessionId: string) =>
      `${adkSessionsPath(contextId, agentName)}/${enc(sessionId)}/artifacts`,
    artifact: (contextId: string, agentName: AdkAgentName, sessionId: string, artifactId: string) =>
      `${adkSessionsPath(contextId, agentName)}/${enc(sessionId)}/artifacts/${enc(artifactId)}`,

    playbooks: (contextId: string) => `/contexts/${enc(contextId)}/playbooks`,
    playbook: (contextId: string, playbookId: string) =>
      `/contexts/${enc(contextId)}/playbooks/${enc(playbookId)}`,
    contextObjects: (contextId: string) => `/contexts/${enc(contextId)}/context-objects`,
    contextVersions: (contextId: string) => `/contexts/${enc(contextId)}/context-versions`,
  },

  agentLibrary: {
    agents: '/agents',
    agent: (id: string) => `/agents/${enc(id)}`,
    schedule: (id: string) => `/agents/${enc(id)}/schedule`,
    sessions: (id: string) => `/agents/${enc(id)}/sessions`,
    session: (id: string, sessionId: string) => `/agents/${enc(id)}/sessions/${enc(sessionId)}`,
    messages: (id: string, sessionId: string) => `/agents/${enc(id)}/sessions/${enc(sessionId)}/messages`,
  },
} as const

export function versionParams(version?: string | null): { version?: string } {
  return version ? { version } : {}
}
