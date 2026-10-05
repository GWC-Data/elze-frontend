import { contextHttp } from '@/api/client'
import { endpoints, versionParams } from '@/api/endpoints'
import type {
  ContextVersion,
  ContextVersionState,
  WorkflowStepId,
} from '@/types/metadataLakehouse'

export function fetchVersions(connectionId: string): Promise<ContextVersionState> {
  return contextHttp.get<ContextVersionState>(endpoints.context.versions(connectionId))
}

export function trackStep(
  connectionId: string,
  step: WorkflowStepId
): Promise<{ draft: ContextVersion | null }> {
  return contextHttp.patch<{ draft: ContextVersion | null }>(endpoints.context.draft(connectionId), {
    step,
  })
}

export function createVersion(connectionId: string): Promise<ContextVersionState> {
  return contextHttp.post<ContextVersionState>(endpoints.context.versions(connectionId))
}

export function deleteVersion(
  connectionId: string,
  versionId: string
): Promise<{ deleted: { id: string; name: string; version: number; label: string } }> {
  return contextHttp.delete(endpoints.context.version(connectionId, versionId))
}

export interface StoredExtraction {
  sessionId: string | null
  text: string
  mode: string | null
  datasetIds: string[] | null
  extractedAt: string | null
}

export function fetchStoredExtraction(
  connectionId: string,
  version?: string | null
): Promise<StoredExtraction | null> {
  return contextHttp.get<StoredExtraction | null>(endpoints.context.extraction(connectionId), {
    params: versionParams(version),
  })
}

export function saveExtraction(
  connectionId: string,
  body: { sessionId: string; report: string; datasetIds: string[] }
): Promise<unknown> {
  return contextHttp.put(endpoints.context.extraction(connectionId), body)
}
