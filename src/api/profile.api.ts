import { contextHttp } from '@/api/client'
import { endpoints, versionParams } from '@/api/endpoints'
import type { ProfileOverview, TableProfile } from '@/types/metadataLakehouse'

export function fetchProfileOverview(connectionId: string, version?: string | null): Promise<ProfileOverview> {
  return contextHttp.get<ProfileOverview>(endpoints.context.profileOverview(connectionId), {
    params: versionParams(version),
  })
}

export function fetchTableProfile(
  connectionId: string,
  tableId: string,
  version?: string | null
): Promise<TableProfile> {
  return contextHttp.get<TableProfile>(endpoints.context.tableProfile(connectionId, tableId), {
    params: versionParams(version),
  })
}
