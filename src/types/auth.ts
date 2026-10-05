export type UserStatus = 'pending' | 'active' | 'disabled'

export interface AuthUser {
  id: number
  companyId: number | null
  companyName: string | null
  username: string
  email: string
  displayName: string | null
  role: RoleName
  // A company's own role, when the member holds one (its permissions replace USER's).
  customRoleId?: number | null
  customRoleName?: string | null
  status: UserStatus
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string | null
  // Already limited to the company's enabled features by the server.
  permissions: string[]
  // The company's enabled features (types/admin.ts FeatureId), Metadata Lakehouse included.
  features?: string[]
}

export type RoleName = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'USER'

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
