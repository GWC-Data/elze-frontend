export type UserStatus = 'pending' | 'active' | 'disabled'

export interface AuthUser {
  id: number
  companyId: number | null
  companyName: string | null
  username: string
  email: string
  displayName: string | null
  role: RoleName
  roleId?: string | null
  roleName?: string | null
  roleKind?: RoleKind | null
  customRoleId?: string | null
  customRoleName?: string | null
  status: UserStatus
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string | null
  permissions: string[]
  features?: string[]
}

export type RoleName = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'USER'

export type RoleKind = 'system' | 'company_default' | 'custom'

export type AuthStatus =
  | 'RESTORING'
  | 'UNAUTHENTICATED'
  | 'AUTHENTICATED'
  | 'PASSWORD_CHANGE_REQUIRED'
  | 'SESSION_EXPIRED'
  | 'ACCOUNT_DISABLED'

export interface SessionResponse {
  expiresIn: number
  state: 'AUTHENTICATED' | 'PASSWORD_CHANGE_REQUIRED'
  user: AuthUser
}

export type AccessLevel = 'view' | 'share' | 'developer' | 'admin'

export interface AccessibleDashboard {
  id: string
  title?: string
  source: string
  accessLevel: AccessLevel
}

export interface Profile {
  state: 'AUTHENTICATED' | 'PASSWORD_CHANGE_REQUIRED'
  user: AuthUser
  dashboards: AccessibleDashboard[]
}

export interface SessionSummary {
  familyId: string
  lastUsedAt: string
  current: boolean
}

export interface ActivationTarget {
  username: string
  email: string
  displayName: string | null
  companyName: string | null
}
