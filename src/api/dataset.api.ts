import { contextHttp } from '@/api/client'
import { endpoints, versionParams } from '@/api/endpoints'
import type { Connection, DatasetListing, SelectedDataset, WarehouseDataset } from '@/types/metadataLakehouse'

export function fetchDatasets(
  connectionId: string,
  limit?: number,
  version?: string | null
): Promise<DatasetListing> {
  return contextHttp.get<DatasetListing>(endpoints.context.datasets(connectionId), {
    params: { ...(limit ? { limit } : {}), ...versionParams(version) },
  })
}

export function saveSelection(
  connectionId: string,
  datasets: Array<Pick<SelectedDataset, 'id'> & Partial<WarehouseDataset>>
): Promise<Connection> {
  return contextHttp.put<Connection>(endpoints.context.datasets(connectionId), { datasets })
}
