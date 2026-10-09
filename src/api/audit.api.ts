import { get } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type { AuditLogPage, ListQuery } from '@/types/admin'

export type AuditCategory = 'company' | 'lakehouse' | 'auth' | 'people' | 'dashboards' | 'companies'

export type AuditAction = 'create' | 'update' | 'delete'

export interface AuditFilters {
  event?: string
  category?: AuditCategory
  action?: AuditAction
  from?: string
  to?: string
}

export function fetchAuditLogs(query: ListQuery & AuditFilters): Promise<AuditLogPage> {
  return get<AuditLogPage>(endpoints.audit, { params: query })
}
