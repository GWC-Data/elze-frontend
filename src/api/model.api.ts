import { contextHttp } from '@/api/client'
import { endpoints, versionParams } from '@/api/endpoints'
import type { ModelEdge, ModelGraph } from '@/types/metadataLakehouse'
import { decideReviewItem } from '@/api/review.api'

export function fetchModel(connectionId: string, version?: string | null): Promise<ModelGraph> {
  return contextHttp.get<ModelGraph>(endpoints.context.model(connectionId), { params: versionParams(version) })
}

export function decideRelationship(
  connectionId: string,
  relationshipId: string,
  status: 'accepted' | 'rejected'
): Promise<unknown> {
  return decideReviewItem(
    connectionId,
    relationshipId,
    status === 'accepted' ? 'approve' : 'reject'
  )
}

export type { ModelEdge }
