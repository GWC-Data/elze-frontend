import { contextHttp } from '@/api/client'
import { endpoints, versionParams } from '@/api/endpoints'
import type { GlossaryQuery, Understanding } from '@/types/metadataLakehouse'

export interface ContextObject {
  id: string
  objectType: string
  qualifiedName: string
  sourceType: string
  verified: boolean
  payload: Record<string, unknown> | null
}

export interface ContextObjects {
  resolvedVersionId: string | null
  count: number
  counts: Record<string, number>
  matched: number
  objects: ContextObject[]
}

export interface ContextObjectsQuery {
  type?: string
  search?: string
  page: number
  pageSize: number
}

function params<T extends object>(query: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all')
  ) as Partial<T>
}

export function fetchContextObjects(
  connectionId: string,
  query: ContextObjectsQuery,
  version?: string | null
): Promise<ContextObjects> {
  return contextHttp.get<ContextObjects>(endpoints.context.contextObjects(connectionId), {
    params: { ...params(query), ...versionParams(version) },
  })
}

export interface Fact {
  id: string
  objectType: string
  qualifiedName: string
  sourceType: string
  verified: boolean
  confidence: number | null
  status: string
  edited: boolean
  payload: Record<string, unknown>
}

export interface TableFacts {
  table: Fact
  columns: Fact[]
  related: Fact[]
  needsReview?: number
}

export interface FactsByTable {
  resolvedVersionId: string | null
  count: number
  counts: Record<string, number>
  needsReview: number
  reviewCounts?: { tables: number; columns: number }
  tableCount: number
  matched: number
  tables: TableFacts[]
  unattached: Fact[]
}

export interface FactsByTableQuery {
  search?: string
  review?: 'pending'
  page: number
  pageSize: number
}

export function fetchFactsByTable(
  connectionId: string,
  query: FactsByTableQuery,
  version?: string | null
): Promise<FactsByTable> {
  return contextHttp.get<FactsByTable>(endpoints.context.factsByTable(connectionId), {
    params: { ...params(query), ...versionParams(version) },
  })
}

export function fetchUnderstanding(
  connectionId: string,
  query: GlossaryQuery,
  version?: string | null
): Promise<Understanding> {
  return contextHttp.get<Understanding>(endpoints.context.understanding(connectionId), {
    params: { ...params(query), ...versionParams(version) },
  })
}
