import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient, UseQueryOptions } from '@tanstack/react-query'
import { isEndpointMissing } from '@/api/client'
import * as connectionsApi from '@/api/connection.api'
import * as datasetsApi from '@/api/dataset.api'
import * as profileApi from '@/api/profile.api'
import * as modelApi from '@/api/model.api'
import * as reviewApi from '@/api/review.api'
import * as publishApi from '@/api/publish.api'
import * as extractionApi from '@/api/extraction.api'
import * as contextObjectsApi from '@/api/contextObjects.api'
import * as versionsApi from '@/api/version.api'
import { contextKeys } from '@/lib/queryKeys'
import { useViewVersionId } from '@/context/workflowContext'
import type {
  CompanyPublished,
  CompanyPublishedQuery,
  Connection,
  Connector,
  ContextProfile,
  ContextVersionState,
  Understanding,
  WorkflowStepId,
  CreatedConnection,
  ModelGraph,
  ProfileOverview,
  PublishResult,
  PublishSummary,
  PublishedVersion,
  PublishValidation,
  ReviewItem,
  ReviewItemUpdate,
  ReviewQueue,
  SelectedDataset,
  TableProfile,
  WarehouseDataset,
  DatasetListing,
  GlossaryQuery,
  ReviewQuery,
} from '@/types/metadataLakehouse'
import type { ExtractionResult } from '@/api/extraction.api'
import type {
  ContextObjects,
  ContextObjectsQuery,
  FactsByTable,
  FactsByTableQuery,
} from '@/api/contextObjects.api'

function proposedQueryOptions<T>() {
  return {
    retry: (failureCount: number, error: unknown) =>
      !isEndpointMissing(error) && failureCount < 2,
  } satisfies Partial<UseQueryOptions<T>>
}

function scoped(version: string | null) {
  return version ? [{ version }] : []
}

export function useContextVersions(connectionId: string | null, enabled = true) {
  return useQuery<ContextVersionState>({
    queryKey: contextKeys.versions(connectionId ?? ''),
    queryFn: () => versionsApi.fetchVersions(connectionId!),
    enabled: Boolean(connectionId) && enabled,
  })
}

export function useTrackStep(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<unknown, unknown, WorkflowStepId>({
    mutationFn: (step) => versionsApi.trackStep(connectionId!, step),
    onSuccess: () => qc.invalidateQueries({ queryKey: contextKeys.versions(connectionId ?? '') }),
  })
}

function invalidateVersions(qc: QueryClient, connectionId: string | null) {
  qc.invalidateQueries({ queryKey: contextKeys.versions(connectionId ?? '') })
  qc.invalidateQueries({ queryKey: contextKeys.understanding(connectionId ?? '') })
  qc.invalidateQueries({ queryKey: contextKeys.connections(), exact: true })
}

export function useCreateVersion(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<ContextVersionState, unknown, void>({
    mutationFn: () => versionsApi.createVersion(connectionId!),
    onSuccess: (state) => {
      qc.setQueryData(contextKeys.versions(connectionId ?? ''), state)
      qc.invalidateQueries({ queryKey: contextKeys.connections() })
      qc.invalidateQueries({ queryKey: contextKeys.companyPublished() })
    },
  })
}

export function useDeleteVersion() {
  const qc = useQueryClient()
  return useMutation<unknown, unknown, { connectionId: string; versionId: string }>({
    mutationFn: ({ connectionId, versionId }) => versionsApi.deleteVersion(connectionId, versionId),
    onSuccess: (_data, { connectionId, versionId }) => {
      qc.invalidateQueries({ queryKey: contextKeys.companyPublished() })
      qc.invalidateQueries({ queryKey: contextKeys.connections(), exact: true })
      qc.invalidateQueries({ queryKey: contextKeys.versions(connectionId) })
      qc.removeQueries({
        predicate: (q) =>
          q.queryKey.some(
            (part) => typeof part === 'object' && part !== null && (part as { version?: string }).version === versionId
          ),
      })
    },
  })
}

export function useConnectors() {
  return useQuery<Connector[]>({
    queryKey: contextKeys.connectors(),
    queryFn: () => connectionsApi.listConnectors(),
    staleTime: 30 * 60_000,
  })
}

export function useConnections() {
  return useQuery<Connection[]>({
    queryKey: contextKeys.connections(),
    queryFn: () => connectionsApi.listConnections(),
  })
}

export function useConnection(connectionId: string | null) {
  const version = useViewVersionId()
  return useQuery<Connection>({
    queryKey: [...contextKeys.connection(connectionId ?? ''), ...scoped(version)],
    queryFn: () => connectionsApi.getConnection(connectionId!, version),
    enabled: Boolean(connectionId),
  })
}

export function useContextProfile(connectionId: string | null) {
  return useQuery<ContextProfile | null>({
    queryKey: contextKeys.contextProfile(connectionId ?? ''),
    queryFn: () => connectionsApi.getContextProfile(connectionId!),
    enabled: Boolean(connectionId),
  })
}

export function useSaveContextProfile(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<ContextProfile, unknown, { name: string; description: string }>({
    mutationFn: (body) => connectionsApi.saveContextProfile(connectionId!, body),
    onSuccess: (profile) => {
      qc.setQueryData(contextKeys.contextProfile(connectionId ?? ''), profile)
    },
  })
}

export function useCreateConnection() {
  const qc = useQueryClient()
  return useMutation<
    CreatedConnection,
    unknown,
    {
      provider: string
      name: string
      host: string
      token: string
      companyId?: number
      limit?: number
    }
  >({
    mutationFn: (body) => connectionsApi.createConnection(body),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: contextKeys.connections() })
      qc.setQueryData<DatasetListing>(
        contextKeys.datasets(created.connection.id, created.limit),
        {
          datasets: created.datasets,
          fetchedAt: new Date().toISOString(),
          limit: created.limit,
          truncated: created.truncated,
        }
      )
    },
  })
}

export function useVerifyConnection() {
  const qc = useQueryClient()
  return useMutation<{ connection: Connection }, unknown, string>({
    mutationFn: (id) => connectionsApi.verifyConnection(id),
    onSettled: () => qc.invalidateQueries({ queryKey: contextKeys.connections() }),
  })
}

export function useDeleteConnection() {
  const qc = useQueryClient()
  return useMutation<{ deleted: true }, unknown, string>({
    mutationFn: (id) => connectionsApi.deleteConnection(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contextKeys.all }),
  })
}

export function useDatasets(
  connectionId: string | null,
  limit?: number,
  enabled = true
) {
  const version = useViewVersionId()
  return useQuery<DatasetListing>({
    queryKey: [...contextKeys.datasets(connectionId ?? '', limit), ...scoped(version)],
    queryFn: () => datasetsApi.fetchDatasets(connectionId!, limit, version),
    enabled: Boolean(connectionId) && enabled,
    staleTime: 0,
    placeholderData: (prev) => prev,
  })
}

export function useSaveSelection(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<
    Connection,
    unknown,
    Array<Pick<SelectedDataset, 'id'> & Partial<WarehouseDataset>>
  >({
    mutationFn: (datasets) => datasetsApi.saveSelection(connectionId!, datasets),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contextKeys.connections() })
      if (connectionId) {
        qc.invalidateQueries({ queryKey: contextKeys.datasetsAll(connectionId) })
        qc.invalidateQueries({ queryKey: contextKeys.profile(connectionId) })
        qc.invalidateQueries({ queryKey: contextKeys.extraction(connectionId) })
        qc.invalidateQueries({ queryKey: contextKeys.model(connectionId) })
        qc.invalidateQueries({ queryKey: contextKeys.review(connectionId) })
        qc.invalidateQueries({ queryKey: contextKeys.publish(connectionId) })
        invalidateVersions(qc, connectionId)
      }
    },
  })
}

export function useProfileOverview(connectionId: string | null, enabled = true) {
  const version = useViewVersionId()
  return useQuery<ProfileOverview>({
    queryKey: [...contextKeys.profile(connectionId ?? ''), ...scoped(version)],
    queryFn: () => profileApi.fetchProfileOverview(connectionId!, version),
    enabled: Boolean(connectionId) && enabled,
    ...proposedQueryOptions<ProfileOverview>(),
  })
}

export function useTableProfile(connectionId: string | null, tableId: string | null) {
  const version = useViewVersionId()
  return useQuery<TableProfile>({
    queryKey: [...contextKeys.tableProfile(connectionId ?? '', tableId ?? ''), ...scoped(version)],
    queryFn: () => profileApi.fetchTableProfile(connectionId!, tableId!, version),
    enabled: Boolean(connectionId && tableId),
    ...proposedQueryOptions<TableProfile>(),
  })
}

export function useExtraction(connectionId: string | null, enabled = true) {
  const version = useViewVersionId()
  const versions = useContextVersions(connectionId, Boolean(version))
  const sessionId = version
    ? (versions.data?.versions.find((v) => v.id === version)?.sessionId ?? null)
    : null
  return useQuery<ExtractionResult | null>({
    queryKey: [...contextKeys.extraction(connectionId ?? ''), ...scoped(version)],
    queryFn: async () => {
      const stored = await versionsApi.fetchStoredExtraction(connectionId!, version)
      if (stored && stored.text) {
        return {
          sessionId: stored.sessionId ?? '',
          text: stored.text,
          toolCalls: [],
          interrupted: false,
          datasetIds: stored.datasetIds,
          extractedAt: stored.extractedAt,
        }
      }
      const fromAdk = version
        ? sessionId
          ? extractionApi.fetchExtractionSession(connectionId!, sessionId)
          : Promise.resolve(null)
        : extractionApi.fetchLatestExtraction(connectionId!)
      return fromAdk.catch(() => null)
    },
    enabled: Boolean(connectionId) && enabled && (!version || versions.isSuccess),
    staleTime: 5 * 60_000,
    retry: false,
  })
}

export function useRunExtraction(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<ExtractionResult, unknown, { datasetIds: string[]; domain?: string }>({
    mutationFn: async ({ datasetIds, domain }) => {
      const result = await extractionApi.runExtraction(connectionId!, datasetIds, { domain })
      try {
        const final = await extractionApi
          .fetchExtractionSession(connectionId!, result.sessionId)
          .catch(() => null)
        const report = final?.text || result.text
        if (report.trim()) {
          await versionsApi.saveExtraction(connectionId!, {
            sessionId: result.sessionId,
            report,
            datasetIds,
          })
        }
      } catch {}
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contextKeys.extraction(connectionId ?? '') })
      invalidateVersions(qc, connectionId)
      qc.invalidateQueries({ queryKey: contextKeys.model(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.review(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.publish(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.contextObjects(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.factsByTable(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.understanding(connectionId ?? '') })
    },
  })
}

export const DEFAULT_FACTS_QUERY: ContextObjectsQuery = { page: 1, pageSize: 25 }

export function useContextObjects(
  connectionId: string | null,
  query: ContextObjectsQuery = DEFAULT_FACTS_QUERY,
  enabled = true
) {
  const version = useViewVersionId()
  return useQuery<ContextObjects>({
    queryKey: [...contextKeys.contextObjects(connectionId ?? ''), query, ...scoped(version)],
    queryFn: () => contextObjectsApi.fetchContextObjects(connectionId!, query, version),
    enabled: Boolean(connectionId) && enabled,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    retry: false,
  })
}

export const DEFAULT_TABLES_QUERY: FactsByTableQuery = { page: 1, pageSize: 10 }

export function useFactsByTable(
  connectionId: string | null,
  query: FactsByTableQuery = DEFAULT_TABLES_QUERY,
  enabled = true
) {
  const version = useViewVersionId()
  return useQuery<FactsByTable>({
    queryKey: [...contextKeys.factsByTable(connectionId ?? ''), query, ...scoped(version)],
    queryFn: () => contextObjectsApi.fetchFactsByTable(connectionId!, query, version),
    enabled: Boolean(connectionId) && enabled,
    placeholderData: (prev) => prev,
    retry: false,
  })
}

export const DEFAULT_GLOSSARY_QUERY: GlossaryQuery = { filter: 'all', page: 1, pageSize: 10 }

export function useUnderstanding(
  connectionId: string | null,
  query: GlossaryQuery = DEFAULT_GLOSSARY_QUERY,
  enabled = true
) {
  const version = useViewVersionId()
  return useQuery<Understanding>({
    queryKey: [...contextKeys.understanding(connectionId ?? ''), query, ...scoped(version)],
    queryFn: () => contextObjectsApi.fetchUnderstanding(connectionId!, query, version),
    enabled: Boolean(connectionId) && enabled,
    placeholderData: (prev) => prev,
    ...proposedQueryOptions<Understanding>(),
  })
}

export function useModel(connectionId: string | null, enabled = true) {
  const version = useViewVersionId()
  return useQuery<ModelGraph>({
    queryKey: [...contextKeys.model(connectionId ?? ''), ...scoped(version)],
    queryFn: () => modelApi.fetchModel(connectionId!, version),
    enabled: Boolean(connectionId) && enabled,
    refetchInterval: (query) =>
      query.state.data?.status === 'generating' ? 4000 : false,
    ...proposedQueryOptions<ModelGraph>(),
  })
}

export function useDecideRelationship(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<unknown, unknown, { id: string; status: 'accepted' | 'rejected' }>({
    mutationFn: ({ id, status }) =>
      modelApi.decideRelationship(connectionId!, id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contextKeys.model(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.review(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.publish(connectionId ?? '') })
      invalidateVersions(qc, connectionId)
    },
  })
}

export function useReviewQueue(
  connectionId: string | null,
  filters: ReviewQuery,
  enabled = true
) {
  const version = useViewVersionId()
  return useQuery<ReviewQueue>({
    queryKey: [...contextKeys.reviewFiltered(connectionId ?? '', filters), ...scoped(version)],
    queryFn: () => reviewApi.fetchReviewQueue(connectionId!, filters, version),
    enabled: Boolean(connectionId) && enabled,
    placeholderData: (prev) => prev,
    ...proposedQueryOptions<ReviewQueue>(),
  })
}

export function useDecideReviewItem(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<
    ReviewItem,
    unknown,
    { id: string; decision: 'approve' | 'reject' | 'skip' }
  >({
    mutationFn: ({ id, decision }) =>
      reviewApi.decideReviewItem(connectionId!, id, decision),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contextKeys.review(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.publish(connectionId ?? '') })
      invalidateVersions(qc, connectionId)
    },
  })
}

export function useUpdateReviewItem(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<
    ReviewItem,
    unknown,
    { id: string; body: ReviewItemUpdate; approve?: boolean }
  >({
    mutationFn: ({ id, body, approve }) =>
      approve
        ? reviewApi.updateAndApproveReviewItem(connectionId!, id, body)
        : reviewApi.updateReviewItem(connectionId!, id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contextKeys.review(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.factsByTable(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.contextObjects(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.understanding(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.publish(connectionId ?? '') })
      invalidateVersions(qc, connectionId)
    },
  })
}

export function useBulkDecide(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<
    { affected: number },
    unknown,
    {
      decision: 'approve' | 'reject' | 'skip'
      filter: { minConfidence?: number; type?: string; status?: string }
    }
  >({
    mutationFn: (body) => reviewApi.bulkDecide(connectionId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contextKeys.review(connectionId ?? '') })
      qc.invalidateQueries({ queryKey: contextKeys.publish(connectionId ?? '') })
      invalidateVersions(qc, connectionId)
    },
  })
}

export function usePublishSummary(connectionId: string | null, enabled = true) {
  const version = useViewVersionId()
  return useQuery<PublishSummary>({
    queryKey: [...contextKeys.publishSummary(connectionId ?? ''), ...scoped(version)],
    queryFn: () => publishApi.fetchPublishSummary(connectionId!, version),
    enabled: Boolean(connectionId) && enabled,
    staleTime: 0,
    ...proposedQueryOptions<PublishSummary>(),
  })
}

export function useValidatePublish(connectionId: string | null) {
  return useMutation<PublishValidation, unknown, void>({
    mutationFn: () => publishApi.validatePublish(connectionId!),
  })
}

export function usePublish(connectionId: string | null) {
  const qc = useQueryClient()
  return useMutation<PublishResult, unknown, { name: string; notifyTeam?: boolean }>({
    mutationFn: (body) => publishApi.publishContext(connectionId!, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: contextKeys.all }),
  })
}

export function useCompanyPublished(query: CompanyPublishedQuery) {
  return useQuery<CompanyPublished>({
    queryKey: [...contextKeys.companyPublished(), query],
    queryFn: () => publishApi.listCompanyPublished(query),
    placeholderData: (prev) => prev,
    retry: false,
  })
}

export function usePublications(connectionId: string | null, enabled = true) {
  return useQuery<PublishedVersion[]>({
    queryKey: [...contextKeys.publish(connectionId ?? ''), 'versions'],
    queryFn: () => publishApi.listPublications(connectionId!),
    enabled: Boolean(connectionId) && enabled,
    ...proposedQueryOptions<PublishedVersion[]>(),
  })
}
