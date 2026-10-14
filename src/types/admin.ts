import type { AccessLevel, AuthUser, RoleName, UserStatus } from '@/types/auth'

export interface Paged<T> {
  items: T[]
  total: number
}

export interface ListQuery {
  page: number
  pageSize: number
  search?: string
  sort?: string
  dir?: 'asc' | 'desc'
}

export interface Company {
  id: number
  name: string
  slug: string
  active: boolean
  createdAt: string | null
  userCount?: number
  dashboardCount?: number
  pendingCount?: number
  features?: FeatureKey[]
  admin?: AdminUser
}

export type FeatureKey = 'metadata_lakehouse' | 'data_analyst' | 'agents' | 'dashboards'

export interface FeatureDef {
  id: string
  key: FeatureKey
  label: string
  description: string
  locked: boolean
  covers: string[]
}

export interface CompanyFeature extends FeatureDef {
  enabled: boolean
}

export interface CompanyFeatures {
  companyId: number
  features: CompanyFeature[]
}

export interface CompanyOption {
  id: number
  name: string
  active: boolean
}

export interface NewCompany {
  name: string
  slug?: string
  featureIds?: string[]
  admin: {
    username: string
    email: string
    displayName?: string
  }
}

export type AdminUser = Omit<AuthUser, 'permissions'>

export interface UserListItem {
  id: number
  username: string
  email: string
  role: RoleName
  roleId?: string | null
  roleName?: string | null
  customRoleId?: string
  customRoleName?: string | null
  status: UserStatus
  displayName?: string
  lastLoginAt?: string
  companyName?: string
}

export interface UserOption {
  id: number
  username: string
  email: string
}

export interface PermissionDef {
  id: string
  key: string
  label: string
  description: string
  platformOnly: boolean
  adminOnly?: boolean
  feature?: FeatureKey | null
  featureId?: string | null
}

export interface RolePermissionOption extends PermissionDef {
  feature: FeatureKey | null
  featureEnabled: boolean
  assignable: boolean
  adminOnly: boolean
}

export interface RolePermissionOptions {
  companyId: number
  features: FeatureKey[]
  permissions: RolePermissionOption[]
}

export interface CompanyRole {
  id: string
  name: string
  description: string | null
  permissionIds: string[]
  userCount: number
  createdAt: string | null
  updatedAt: string | null
  modifiedAt: string | null
  modifiedBy: string | null
}

export interface BuiltInCompanyRole {
  id: string
  name: RoleName
  label: string
  permissionIds: string[]
  userCount: number
  editable: boolean
  customized: boolean
  modifiedAt: string | null
  modifiedBy: string | null
}

export interface CompanyRoles {
  companyId: number
  features: FeatureKey[]
  builtIn: BuiltInCompanyRole[]
  custom: CompanyRole[]
}

export interface CompanyRoleInput {
  name: string
  description?: string | null
  permissionIds: string[]
  companyId?: number
}

export interface AccessLevelDef {
  id: string
  key: AccessLevel
  rank: number
  label: string
  description: string
}

export interface Role {
  id: string
  name: RoleName
  label: string
  scope: 'platform' | 'company'
  description: string | null
  userCount: number
}

export interface RolePermissions {
  id: string
  role: RoleName
  label: string
  scope: 'platform' | 'company'
  editable: boolean
  permissionIds: string[]
}

export interface UserPermissions {
  userId: number
  role: { id: string | null; name: string | null; tier: RoleName; kind: string | null }
  rolePermissionIds: string[]
  extraPermissionIds: string[]
  editable: boolean
  options: RolePermissionOption[]
}

export interface Group {
  id: number
  companyId: number
  companyName: string
  name: string
  active: boolean
  createdAt: string | null
  memberCount: number
}

export interface GroupDetail extends Group {
  userIds: number[]
}

export interface DashboardSummary {
  id: string
  title?: string | null
  source: string
  assigned?: boolean
}

export interface UserGrant {
  dashboardId: string
  dashboardTitle: string | null
  level: AccessLevel
  levelId: string
  origin: 'direct' | 'group'
  groupId?: number
  groupName?: string
}

export interface DashboardGrants {
  dashboardId: string
  you?: {
    userId: number
    level: AccessLevel
    levelId: string | null
    administrator: boolean
    mayRevoke: boolean
  }
  users: Array<{
    userId: number
    username: string
    email: string
    level: AccessLevel
    levelId: string
  }>
  groups: Array<{
    groupId: number
    groupName: string
    level: AccessLevel
    levelId: string
    active: boolean
  }>
}

export interface GroupDashboards {
  available: Array<{ id: string; title: string | null }>
  held: Array<{ id: string; title: string | null; level: AccessLevel; levelId: string | null }>
}

export interface ScopeDimension {
  dimension: string
  label: string
  values: string[]
  error?: string
}

export interface ScopeOptions {
  enforced: boolean
  dimensions: ScopeDimension[]
}

export interface UserScope {
  userId: number
  scopes: Record<string, string[]>
  enforced: boolean
}

export interface AuditLogEntry {
  id?: string
  ts: string
  event: string
  label: string
  tone: 'danger' | 'warning' | 'success' | 'neutral'
  summary: string
  detail: Record<string, unknown>
  actor?: string
  actorId?: number
  actorCompanyId?: number
  companyId?: number
  companyName?: string
}

export type AuditScope = 'all' | 'company' | 'self'

export interface AuditLogPage extends Paged<AuditLogEntry> {
  scope: AuditScope
}

export interface PlatformOverview {
  companies: number
  companiesActive: number
  companiesInactive: number
  users: number
  usersActive: number
  usersPending: number
  companyAdmins: number
  groups: number
  assignments: number
  dashboards: number
  factsGenerated?: number | null
  factsPending?: number | null
}

export interface WorkspaceOverview {
  users: number
  usersActive: number
  usersPending: number
  groups: number
  groupsActive: number
  dashboards: number
  dashboardsGranted: number
  factsGenerated?: number | null
  factsPending?: number | null
}

export interface PlatformSettings {
  tokens: {
    accessTokenTtlSeconds: number
    refreshTokenTtlSeconds: number
    activationTokenTtlSeconds: number
  }
  login: { maxAttempts: number; windowSeconds: number; lockoutSeconds: number }
  password: { minLength: number; bcryptRounds: number }
  session: { cookieSecure: boolean; cookieSameSite: string }
  engine: { queryConcurrency: number; dashboardCount: number }
  email: { provider: string; from: string }
}

export interface HealthStatus {
  status: 'ok' | 'starting'
  detail: string | null
  email: string
}
