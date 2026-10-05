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
  // Enabled feature ids, Metadata Lakehouse included.
  features?: FeatureId[]
  admin?: AdminUser
}

// backend/src/constants/features.ts - keep the ids in step.
export type FeatureId = 'metadata_lakehouse' | 'data_analyst' | 'agents' | 'dashboards'

export interface FeatureDef {
  id: FeatureId
  label: string
  description: string
  // On for every company; shown switched on and disabled.
  locked: boolean
  // The sidebar entries it covers.
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
  // Toggleable features to switch on; Metadata Lakehouse is always on.
  features?: FeatureId[]
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
  customRoleId?: number
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
  label: string
  description: string
  platformOnly: boolean
  // The feature that owns it; null = core (people, groups, roles, audit).
  feature?: FeatureId | null
}

// One row of a company's role editor (GET /roles/permissions).
export interface RolePermissionOption extends PermissionDef {
  feature: FeatureId | null
  // The company has the feature (always true for core permissions).
  featureEnabled: boolean
  // This caller may put it in a role: feature on, not admin-only, and held by the caller.
  assignable: boolean
  // Stays with the company admin role; never in a custom role.
  adminOnly: boolean
}

export interface RolePermissionOptions {
  companyId: number
  features: FeatureId[]
  permissions: RolePermissionOption[]
}

export interface CompanyRole {
  id: number
  name: string
  description: string | null
  permissions: string[]
  userCount: number
  createdAt: string | null
  updatedAt: string | null
  // Who in the company last changed it, and when.
  modifiedAt: string | null
  modifiedBy: string | null
}

export interface BuiltInCompanyRole {
  name: RoleName
  label: string
  permissions: string[]
  userCount: number
  // The caller may change it for this company (Member only; never Company admin).
  editable: boolean
  // The company has edited its copy: it no longer follows the platform owner's defaults.
  customized: boolean
  modifiedAt: string | null
  modifiedBy: string | null
}

export interface CompanyRoles {
  companyId: number
  features: FeatureId[]
  builtIn: BuiltInCompanyRole[]
  custom: CompanyRole[]
}

export interface CompanyRoleInput {
  name: string
  description?: string | null
  permissions: string[]
  companyId?: number
}

export interface AccessLevelDef {
  id: AccessLevel
  description: string
}

export interface Role {
  name: RoleName
  scope: 'platform' | 'company'
  description: string | null
  userCount: number
}

export interface RolePermissions {
  role: RoleName
  scope: 'platform' | 'company'
  editable: boolean
  permissions: string[]
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
  origin: 'direct' | 'group'
  groupId?: number
  groupName?: string
}

export interface DashboardGrants {
  dashboardId: string
  you?: {
    userId: number
    level: AccessLevel
    administrator: boolean
    mayRevoke: boolean
  }
  users: Array<{
    userId: number
    username: string
    email: string
    level: AccessLevel
  }>
  groups: Array<{
    groupId: number
    groupName: string
    level: AccessLevel
    active: boolean
  }>
}

export interface GroupDashboards {
  available: Array<{ id: string; title: string | null }>
  held: Array<{ id: string; title: string | null; level: AccessLevel }>
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

/** How much of the trail the reader sees: the platform everything, a company admin their company, a user their own. */
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
}

export interface WorkspaceOverview {
  users: number
  usersActive: number
  usersPending: number
  groups: number
  groupsActive: number
  dashboards: number
  dashboardsGranted: number
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
