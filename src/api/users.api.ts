import { del, get, patch, post, put } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type { RoleName } from '@/types/auth'
import type { AdminUser, ListQuery, Paged, UserListItem, UserPermissions } from '@/types/admin'

export interface NewPerson {
  username: string
  email: string
  displayName?: string
  role: RoleName
  customRoleId?: string | null
  companyId?: number
}

export function createUsersApi(base: string) {
  return {
    list: (query: ListQuery & { companyId?: number; role?: string; status?: string }) =>
      get<Paged<UserListItem>>(base, { params: query }),
    fetch: (id: number) => get<AdminUser>(endpoints.person.one(base, id)),
    create: (body: NewPerson) => post<AdminUser>(base, body),
    update: (id: number, body: { role?: RoleName; customRoleId?: string | null; displayName?: string | null }) =>
      patch<AdminUser>(endpoints.person.one(base, id), body),
    deactivate: (id: number) => post<AdminUser>(endpoints.person.deactivate(base, id)),
    activate: (id: number) => post<AdminUser>(endpoints.person.activate(base, id)),
    resendActivation: (id: number) => post<AdminUser>(endpoints.person.activation(base, id)),
    remove: (id: number) => del<{ deleted: true }>(endpoints.person.one(base, id)),
    permissions: (id: number) => get<UserPermissions>(endpoints.person.permissions(base, id)),
    savePermissions: (id: number, permissionIds: string[]) =>
      put<UserPermissions>(endpoints.person.permissions(base, id), { permissionIds }),
  }
}

export const platformUsers = createUsersApi(endpoints.platform.users)

export const teamUsers = createUsersApi(endpoints.users.root)
