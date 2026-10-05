import { del, get, post, put } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import { teamUsers } from '@/api/users.api'
import type { AccessLevel } from '@/types/auth'
import type {
  AccessLevelDef,
  Company,
  DashboardGrants,
  DashboardSummary,
  Group,
  GroupDashboards,
  GroupDetail,
  HealthStatus,
  ScopeOptions,
  UserGrant,
  UserOption,
  UserScope,
  WorkspaceOverview,
} from '@/types/admin'

export function fetchMyCompany(): Promise<Company> {
  return get<Company>(endpoints.workspace.company)
}

export function fetchWorkspaceOverview(): Promise<WorkspaceOverview> {
  return get<WorkspaceOverview>(endpoints.workspace.overview)
}

export const listTeam = teamUsers.list
export const fetchTeamMember = teamUsers.fetch
export const createTeamMember = teamUsers.create
export const updateTeamMember = teamUsers.update
export const deactivateTeamMember = teamUsers.deactivate
export const activateTeamMember = teamUsers.activate
export const resendTeamActivation = teamUsers.resendActivation
export const deleteTeamMember = teamUsers.remove

export function listUserOptions(): Promise<UserOption[]> {
  return get<UserOption[]>(endpoints.users.options)
}

export function fetchUserGrants(id: number): Promise<UserGrant[]> {
  return get<UserGrant[]>(endpoints.users.access(id))
}

export function fetchScopeOptions(): Promise<ScopeOptions> {
  return get<ScopeOptions>(endpoints.users.scopeOptions)
}

export function fetchUserScope(id: number): Promise<UserScope> {
  return get<UserScope>(endpoints.users.scope(id))
}

export function saveUserScope(id: number, scopes: Record<string, string[]>): Promise<UserScope> {
  return put<UserScope>(endpoints.users.scope(id), { scopes })
}

export function listGroups(): Promise<Group[]> {
  return get<Group[]>(endpoints.groups.root)
}

export function fetchGroup(id: number): Promise<GroupDetail> {
  return get<GroupDetail>(endpoints.groups.one(id))
}

export function createGroup(body: {
  name: string
  active?: boolean
  userIds?: number[]
  companyId?: number
}): Promise<Group> {
  return post<Group>(endpoints.groups.root, body)
}

export function updateGroup(
  id: number,
  body: { name?: string; active?: boolean; userIds?: number[] }
): Promise<Group> {
  return put<Group>(endpoints.groups.one(id), body)
}

export function deleteGroup(id: number): Promise<{ deleted: true }> {
  return del<{ deleted: true }>(endpoints.groups.one(id))
}

export function listAccessLevels(): Promise<AccessLevelDef[]> {
  return get<AccessLevelDef[]>(endpoints.access.levels)
}

export function listGrantableDashboards(companyId?: number): Promise<DashboardSummary[]> {
  return get<DashboardSummary[]>(endpoints.access.grantable, {
    params: companyId ? { companyId } : undefined,
  })
}

export function fetchDashboardGrants(dashboardId: string, companyId?: number): Promise<DashboardGrants> {
  return get<DashboardGrants>(endpoints.access.grants(dashboardId), {
    params: companyId ? { companyId } : undefined,
  })
}

export function listShareablePeople(dashboardId: string): Promise<UserOption[]> {
  return get<UserOption[]>(endpoints.access.people(dashboardId))
}

export function grantUserAccess(dashboardId: string, userId: number, level: AccessLevel): Promise<unknown> {
  return put(endpoints.access.user(dashboardId, userId), { level })
}

export function revokeUserAccess(dashboardId: string, userId: number): Promise<unknown> {
  return del(endpoints.access.user(dashboardId, userId))
}

export function grantGroupAccess(dashboardId: string, groupId: number, level: AccessLevel): Promise<unknown> {
  return put(endpoints.access.group(dashboardId, groupId), { level })
}

export function revokeGroupAccess(dashboardId: string, groupId: number): Promise<unknown> {
  return del(endpoints.access.group(dashboardId, groupId))
}

export function fetchGroupDashboards(groupId: number): Promise<GroupDashboards> {
  return get<GroupDashboards>(endpoints.access.groupDashboards(groupId))
}

export function fetchHealth(): Promise<HealthStatus> {
  return get<HealthStatus>(endpoints.health)
}
