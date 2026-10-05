import { del, get, patch, post, put } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import { platformUsers } from '@/api/users.api'
import type { RoleName } from '@/types/auth'
import type {
  Company,
  CompanyFeatures,
  CompanyOption,
  FeatureDef,
  FeatureId,
  DashboardSummary,
  ListQuery,
  NewCompany,
  Paged,
  PermissionDef,
  PlatformOverview,
  PlatformSettings,
  Role,
  RolePermissions,
} from '@/types/admin'

const OPTIONS_TTL_MS = 30_000
let optionsCache: { at: number; value: Promise<CompanyOption[]> } | null = null

function invalidateCompanyOptions(): void {
  optionsCache = null
}

export function listCompanies(query: ListQuery & { active?: boolean }): Promise<Paged<Company>> {
  return get<Paged<Company>>(endpoints.platform.companies, { params: query })
}

export function listCompanyOptions(): Promise<CompanyOption[]> {
  if (optionsCache && Date.now() - optionsCache.at < OPTIONS_TTL_MS) return optionsCache.value
  const value = get<CompanyOption[]>(endpoints.platform.companyOptions)
  optionsCache = { at: Date.now(), value }
  value.catch(invalidateCompanyOptions)
  return value
}

export function fetchCompany(id: number): Promise<Company> {
  return get<Company>(endpoints.platform.company(id))
}

export function createCompany(body: NewCompany): Promise<Company> {
  invalidateCompanyOptions()
  return post<Company>(endpoints.platform.companies, body)
}

export function updateCompany(id: number, body: { name?: string; active?: boolean }): Promise<Company> {
  invalidateCompanyOptions()
  return patch<Company>(endpoints.platform.company(id), body)
}

export function deleteCompany(id: number): Promise<{ deleted: true }> {
  invalidateCompanyOptions()
  return del<{ deleted: true }>(endpoints.platform.company(id))
}

export function listFeatures(): Promise<FeatureDef[]> {
  return get<FeatureDef[]>(endpoints.platform.features)
}

export function fetchCompanyFeatures(companyId: number): Promise<CompanyFeatures> {
  return get<CompanyFeatures>(endpoints.platform.companyFeatures(companyId))
}

// The whole set of switched-on features; anything left out is switched off.
export function saveCompanyFeatures(companyId: number, features: FeatureId[]): Promise<CompanyFeatures> {
  return put<CompanyFeatures>(endpoints.platform.companyFeatures(companyId), { features })
}

export function listCompanyDashboards(companyId: number): Promise<DashboardSummary[]> {
  return get<DashboardSummary[]>(endpoints.platform.companyDashboards(companyId))
}

export function assignDashboard(companyId: number, dashboardId: string): Promise<unknown> {
  return put(endpoints.platform.companyDashboard(companyId, dashboardId))
}

export function unassignDashboard(companyId: number, dashboardId: string): Promise<unknown> {
  return del(endpoints.platform.companyDashboard(companyId, dashboardId))
}

export const listUsers = platformUsers.list
export const fetchUser = platformUsers.fetch
export const createUser = platformUsers.create
export const updateUser = platformUsers.update
export const deactivateUser = platformUsers.deactivate
export const activateUser = platformUsers.activate
export const resendActivation = platformUsers.resendActivation
export const deleteUser = platformUsers.remove

export function listRoles(): Promise<Role[]> {
  return get<Role[]>(endpoints.platform.roles)
}

export function listPermissions(): Promise<PermissionDef[]> {
  return get<PermissionDef[]>(endpoints.platform.permissions)
}

export function fetchRolePermissions(name: RoleName): Promise<RolePermissions> {
  return get<RolePermissions>(endpoints.platform.rolePermissions(name))
}

export function saveRolePermissions(name: RoleName, permissions: string[]): Promise<RolePermissions> {
  return put<RolePermissions>(endpoints.platform.rolePermissions(name), { permissions })
}

export function fetchPlatformOverview(): Promise<PlatformOverview> {
  return get<PlatformOverview>(endpoints.platform.overview)
}

export function fetchPlatformSettings(): Promise<PlatformSettings> {
  return get<PlatformSettings>(endpoints.platform.settings)
}
