import { contextHttp } from '@/api/client'
import { endpoints, versionParams } from '@/api/endpoints'
import type { Connection, DatasetPage, DatasetPageQuery, SelectedDataset, WarehouseDataset } from '@/types/metadataLakehouse'

export function fetchDatasetPage(
  connectionId: string,
  { page, pageSize, search }: DatasetPageQuery,
  { fresh = false, version }: { fresh?: boolean; version?: string | null } = {}
): Promise<DatasetPage> {
  return contextHttp.get<DatasetPage>(endpoints.context.datasets(connectionId), {
    params: {
      page,
      pageSize,
      ...(search ? { search } : {}),
      ...(fresh ? { fresh: 'true' } : {}),
      ...versionParams(version),
    },
  })
}

export function saveSelection(
  connectionId: string,
  datasets: Array<Pick<SelectedDataset, 'id'> & Partial<WarehouseDataset>>
): Promise<Connection> {
  return contextHttp.put<Connection>(endpoints.context.datasets(connectionId), { datasets })
}
