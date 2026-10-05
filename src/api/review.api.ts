import { contextHttp } from '@/api/client'
import { endpoints, versionParams } from '@/api/endpoints'
import type { ReviewItem, ReviewItemUpdate, ReviewQuery, ReviewQueue } from '@/types/metadataLakehouse'

export function fetchReviewQueue(
  connectionId: string,
  params: ReviewQuery,
  version?: string | null
): Promise<ReviewQueue> {
  return contextHttp.get<ReviewQueue>(endpoints.context.reviewQueue(connectionId), {
    params: { ...params, ...versionParams(version) },
  })
}

export function decideReviewItem(
  connectionId: string,
  itemId: string,
  decision: 'approve' | 'reject' | 'skip'
): Promise<ReviewItem> {
  return contextHttp.post<ReviewItem>(
    endpoints.context.reviewItemDecision(connectionId, itemId),
    { decision }
  )
}

export function updateReviewItem(
  connectionId: string,
  itemId: string,
  body: ReviewItemUpdate
): Promise<ReviewItem> {
  return contextHttp.patch<ReviewItem>(endpoints.context.reviewItem(connectionId, itemId), body)
}

export function updateAndApproveReviewItem(
  connectionId: string,
  itemId: string,
  body: ReviewItemUpdate
): Promise<ReviewItem> {
  return contextHttp.post<ReviewItem>(
    endpoints.context.reviewItemDecision(connectionId, itemId),
    { decision: 'approve', update: body }
  )
}

export function bulkDecide(
  connectionId: string,
  body: {
    decision: 'approve' | 'reject' | 'skip'
    filter: { minConfidence?: number; type?: string; status?: string }
  }
): Promise<{ affected: number }> {
  return contextHttp.post<{ affected: number }>(
    endpoints.context.reviewBulkDecision(connectionId),
    body
  )
}
