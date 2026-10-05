import { get } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type { AuditLogPage, ListQuery } from '@/types/admin'

/** Groups of events, mirrored from AUDIT_CATEGORIES in backend/src/constants/auditEvents.ts. */
export type AuditCategory = 'company' | 'lakehouse' | 'auth' | 'people' | 'dashboards' | 'companies'

/** What happened, mirrored from AUDIT_ACTIONS. */
export type AuditAction = 'create' | 'update' | 'delete'

export interface AuditFilters {
  event?: string
  category?: AuditCategory
  action?: AuditAction
  /** Inclusive, 'YYYY-MM-DD'. */
  from?: string
  to?: string
}

/** The trail as the signed-in account may see it; the server picks the scope from the role. */
export function fetchAuditLogs(query: ListQuery & AuditFilters): Promise<AuditLogPage> {
  return get<AuditLogPage>(endpoints.audit, { params: query })
}
