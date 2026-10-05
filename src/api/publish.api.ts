import { contextHttp } from '@/api/client'
import { endpoints, versionParams } from '@/api/endpoints'
import type {
  CompanyPublished,
  CompanyPublishedQuery,
  PublishResult,
  PublishSummary,
  PublishValidation,
  PublishedVersion,
} from '@/types/metadataLakehouse'

export function fetchPublishSummary(connectionId: string, version?: string | null): Promise<PublishSummary> {
  return contextHttp.get<PublishSummary>(endpoints.context.publishSummary(connectionId), {
    params: versionParams(version),
  })
}

export function validatePublish(connectionId: string): Promise<PublishValidation> {
  return contextHttp.post<PublishValidation>(endpoints.context.publishValidate(connectionId))
}

export function publishContext(
  connectionId: string,
  body: { name: string; notifyTeam?: boolean }
): Promise<PublishResult> {
  return contextHttp.post<PublishResult>(endpoints.context.publish(connectionId), body)
}

export function listPublications(connectionId: string): Promise<PublishedVersion[]> {
  return contextHttp.get<PublishedVersion[]>(endpoints.context.publish(connectionId))
}

export function listCompanyPublished(query: CompanyPublishedQuery): Promise<CompanyPublished> {
  const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== ''))
  return contextHttp.get<CompanyPublished>(endpoints.context.companyPublished(), { params })
}
