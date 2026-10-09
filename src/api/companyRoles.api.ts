import { del, get, patch, post, put } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type { RoleName } from '@/types/auth'
import type { CompanyRole, CompanyRoleInput, CompanyRoles, RolePermissionOptions } from '@/types/admin'

const withCompany = (companyId?: number) => (companyId ? { params: { companyId } } : undefined)

export function listCompanyRoles(companyId?: number): Promise<CompanyRoles> {
  return get<CompanyRoles>(endpoints.companyRoles.root, withCompany(companyId))
}

export function listRolePermissionOptions(companyId?: number): Promise<RolePermissionOptions> {
  return get<RolePermissionOptions>(endpoints.companyRoles.permissions, withCompany(companyId))
}

export function createCompanyRole(body: CompanyRoleInput): Promise<CompanyRole> {
  return post<CompanyRole>(endpoints.companyRoles.root, body)
}

export function updateCompanyRole(id: number, body: Partial<CompanyRoleInput>): Promise<CompanyRole> {
  return patch<CompanyRole>(endpoints.companyRoles.one(id), body)
}

export function deleteCompanyRole(id: number): Promise<{ deleted: true }> {
  return del<{ deleted: true }>(endpoints.companyRoles.one(id))
}

export function saveBuiltInRole(name: RoleName, permissions: string[], companyId?: number): Promise<CompanyRoles> {
  return put<CompanyRoles>(endpoints.companyRoles.builtIn(name), { permissions, companyId })
}

export function resetBuiltInRole(name: RoleName, companyId?: number): Promise<CompanyRoles> {
  return del<CompanyRoles>(endpoints.companyRoles.builtIn(name), withCompany(companyId))
}
