import { adkRequest } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type {
  AdkAgentName,
  AdkArtifact,
  AdkChatResponse,
  AdkContextLayerMessageBody,
  AdkContextLayerSessionBody,
  AdkContextObject,
  AdkContextObjects,
  AdkContextVersion,
  AdkDataAnalystSessionBody,
  AdkDescriptionEditorMessageBody,
  AdkDescriptionEditorSessionBody,
  AdkInterruptResult,
  AdkMessageBody,
  AdkModel,
  AdkPlaybookDetail,
  AdkPlaybookStatus,
  AdkPlaybookSummary,
  AdkSessionDetail,
  AdkSessionOptions,
  AdkSessionSummary,
  AdkSessionUsage,
} from '@/types/adk'

interface RawArtifact {
  id: string
  filename: string
  mime_type: string
  size_bytes: number
  created_at: string
}

function toArtifact(raw: RawArtifact): AdkArtifact {
  return { id: raw.id, filename: raw.filename, mimeType: raw.mime_type, sizeBytes: raw.size_bytes, createdAt: raw.created_at }
}

interface RawSessionSummary {
  session_id: string
  context_id: string
  agent_name: AdkAgentName
  last_update_time: number | null
}

interface RawSessionDetail extends RawSessionSummary {
  state?: Record<string, unknown>
  turns?: { role: string; text: string }[]
}

function toSessionSummary(raw: RawSessionSummary): AdkSessionSummary {
  return {
    sessionId: raw.session_id,
    contextId: raw.context_id,
    agentName: raw.agent_name,
    lastUpdateTime: raw.last_update_time ?? null,
  }
}

function toSessionDetail(raw: RawSessionDetail): AdkSessionDetail {
  return {
    ...toSessionSummary(raw),
    state: raw.state ?? {},
    turns: (raw.turns ?? []).map((turn) => ({ role: turn.role, text: turn.text })),
  }
}

interface RawChatResponse {
  text: string
  tool_calls?: string[]
  interrupted?: boolean
}

function toChatResponse(raw: RawChatResponse): AdkChatResponse {
  return {
    text: raw.text ?? '',
    toolCalls: raw.tool_calls ?? [],
    interrupted: Boolean(raw.interrupted),
  }
}

function sessionOptions({ initialState, model }: AdkSessionOptions): Record<string, unknown> {
  return { initial_state: initialState ?? null, ...(model ? { model } : {}) }
}

function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return adkRequest<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function createSession(
  contextId: string,
  agentName: AdkAgentName,
  body: Record<string, unknown>
): Promise<AdkSessionSummary> {
  return toSessionSummary(await postJson<RawSessionSummary>(endpoints.adk.sessions(contextId, agentName), body))
}

export function createContextLayerSession(
  contextId: string,
  body: AdkContextLayerSessionBody
): Promise<AdkSessionSummary> {
  return createSession(contextId, 'context_layer_extractor', {
    ...(body.model ? { model: body.model } : {}),
    version_id: body.versionId,
    context_name: body.contextName,
    context_description: body.contextDescription ?? null,
    dataset_ids: body.datasetIds,
  })
}

export function createDataAnalystSession(
  contextId: string,
  body: AdkDataAnalystSessionBody = {}
): Promise<AdkSessionSummary> {
  return createSession(contextId, 'data_analyst', {
    ...sessionOptions(body),
    context_ids: [...new Set([contextId, ...(body.contextIds ?? [])])],
    ...(body.playbookId ? { playbook_id: body.playbookId } : {}),
  })
}

export function createDescriptionEditorSession(
  contextId: string,
  body: AdkDescriptionEditorSessionBody
): Promise<AdkSessionSummary> {
  return createSession(contextId, 'description_editor', { ...sessionOptions(body), version_id: body.versionId })
}

export function createPlaybookBuilderSession(
  contextId: string,
  initialState?: Record<string, unknown>,
  skipKickoff?: boolean
): Promise<AdkSessionSummary> {
  return createSession(contextId, 'playbook_builder', {
    ...sessionOptions({ initialState }),
    skip_kickoff: Boolean(skipKickoff),
  })
}

export async function listAdkSessions(contextId: string, agentName: AdkAgentName): Promise<AdkSessionSummary[]> {
  const raw = await adkRequest<RawSessionSummary[]>(endpoints.adk.sessions(contextId, agentName))
  return raw.map(toSessionSummary)
}

export async function getAdkSession(
  contextId: string,
  agentName: AdkAgentName,
  sessionId: string
): Promise<AdkSessionDetail> {
  const raw = await adkRequest<RawSessionDetail>(endpoints.adk.session(contextId, agentName, sessionId))
  return toSessionDetail(raw)
}

export async function deleteAdkSession(contextId: string, agentName: AdkAgentName, sessionId: string): Promise<void> {
  await adkRequest<void>(endpoints.adk.session(contextId, agentName, sessionId), { method: 'DELETE' })
}

export async function getAdkSessionUsage(
  contextId: string,
  agentName: AdkAgentName,
  sessionId: string
): Promise<AdkSessionUsage> {
  return adkRequest<AdkSessionUsage>(endpoints.adk.usage(contextId, agentName, sessionId))
}

export async function interruptAdkSession(
  contextId: string,
  agentName: AdkAgentName,
  sessionId: string
): Promise<AdkInterruptResult> {
  return adkRequest<AdkInterruptResult>(endpoints.adk.interrupt(contextId, agentName, sessionId), {
    method: 'POST',
  })
}

export async function sendAdkMessage(
  contextId: string,
  agentName: 'data_analyst' | 'playbook_builder',
  sessionId: string,
  body: AdkMessageBody
): Promise<AdkChatResponse> {
  const raw = await postJson<RawChatResponse>(endpoints.adk.messages(contextId, agentName, sessionId), {
    text: body.text,
    stream: false,
    ...(body.artifactIds?.length ? { artifact_ids: body.artifactIds } : {}),
  })
  return toChatResponse(raw)
}

export async function sendDescriptionEditorMessage(
  contextId: string,
  sessionId: string,
  body: AdkDescriptionEditorMessageBody
): Promise<AdkChatResponse> {
  const raw = await postJson<RawChatResponse>(endpoints.adk.messages(contextId, 'description_editor', sessionId), {
    row_ids: body.rowIds,
    text: body.text,
    stream: false,
    ...(body.artifactIds?.length ? { artifact_ids: body.artifactIds } : {}),
  })
  return toChatResponse(raw)
}

const CONTEXT_LAYER_REQUEST =
  "Follow that skill's workflow exactly. Report a summary when done: counts by object_type and " +
  'verified status, PII/policy proposals made.'

export async function triggerContextLayer(
  contextId: string,
  sessionId: string,
  body: AdkContextLayerMessageBody = {}
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(endpoints.adk.messages(contextId, 'context_layer_extractor', sessionId), {
    text: body.text?.trim() || CONTEXT_LAYER_REQUEST,
    ...(body.artifactIds?.length ? { artifact_ids: body.artifactIds } : {}),
  })
}

type ArtifactAgent = Exclude<AdkAgentName, 'playbook_builder'>

export async function uploadAdkArtifact(
  contextId: string,
  agentName: ArtifactAgent,
  sessionId: string,
  file: File
): Promise<AdkArtifact> {
  const formData = new FormData()
  formData.append('file', file)
  const raw = await adkRequest<RawArtifact>(endpoints.adk.artifacts(contextId, agentName, sessionId), {
    method: 'POST',
    body: formData,
  })
  return toArtifact(raw)
}

export async function listAdkArtifacts(
  contextId: string,
  agentName: ArtifactAgent,
  sessionId: string
): Promise<AdkArtifact[]> {
  const raw = await adkRequest<RawArtifact[]>(endpoints.adk.artifacts(contextId, agentName, sessionId))
  return raw.map(toArtifact)
}

export async function deleteAdkArtifact(
  contextId: string,
  agentName: ArtifactAgent,
  sessionId: string,
  artifactId: string
): Promise<void> {
  await adkRequest<void>(endpoints.adk.artifact(contextId, agentName, sessionId, artifactId), {
    method: 'DELETE',
  })
}

interface RawPlaybookSummary {
  playbook_id: string
  name: string
  playbook_status: AdkPlaybookStatus
  version: number
  updated_at: string
  published_at: string | null
}

interface RawPlaybookDetail extends RawPlaybookSummary {
  markdown_content: string
  created_at: string
}

function toPlaybookSummary(raw: RawPlaybookSummary): AdkPlaybookSummary {
  return {
    playbookId: raw.playbook_id,
    name: raw.name,
    playbookStatus: raw.playbook_status,
    version: raw.version,
    updatedAt: raw.updated_at,
    publishedAt: raw.published_at,
  }
}

export async function listAdkPlaybooks(
  contextId: string,
  status?: AdkPlaybookStatus
): Promise<AdkPlaybookSummary[]> {
  const path = endpoints.adk.playbooks(contextId)
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const raw = await adkRequest<{ status: string; count: number; playbooks: RawPlaybookSummary[] }>(`${path}${query}`)
  return raw.playbooks.map(toPlaybookSummary)
}

export async function getAdkPlaybook(contextId: string, playbookId: string): Promise<AdkPlaybookDetail> {
  const raw = await adkRequest<RawPlaybookDetail & { status: string }>(endpoints.adk.playbook(contextId, playbookId))
  return { ...toPlaybookSummary(raw), markdownContent: raw.markdown_content, createdAt: raw.created_at }
}

interface RawContextObject {
  id: string
  context_id: string
  version_id: string
  object_type: string
  qualified_name: string
  source_type: string
  verified: boolean
  confidence: number | string | null
  payload: Record<string, unknown> | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

function toContextObject(raw: RawContextObject): AdkContextObject {
  return {
    id: raw.id,
    contextId: raw.context_id,
    versionId: raw.version_id,
    objectType: raw.object_type,
    qualifiedName: raw.qualified_name,
    sourceType: raw.source_type,
    verified: raw.verified,
    confidence: raw.confidence === null ? null : Number(raw.confidence),
    payload: raw.payload ?? {},
    reviewedBy: raw.reviewed_by,
    reviewedAt: raw.reviewed_at,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

export async function getAdkContextObjects(contextId: string, versionId?: string | null): Promise<AdkContextObjects> {
  const query = versionId ? `?version_id=${encodeURIComponent(versionId)}` : ''
  const raw = await adkRequest<{ context_id: string; resolved_version_id: string | null; objects: RawContextObject[] }>(
    `${endpoints.adk.contextObjects(contextId)}${query}`
  )
  return {
    contextId: raw.context_id,
    resolvedVersionId: raw.resolved_version_id,
    objects: raw.objects.map(toContextObject),
  }
}

export async function listAdkContextVersions(contextId: string, limit?: number): Promise<AdkContextVersion[]> {
  const query = limit ? `?limit=${limit}` : ''
  const raw = await adkRequest<{
    versions: { version_id: string; object_count: number; first_written_at: string; last_updated_at: string }[]
  }>(`${endpoints.adk.contextVersions(contextId)}${query}`)
  return raw.versions.map((v) => ({
    versionId: v.version_id,
    objectCount: Number(v.object_count),
    firstWrittenAt: v.first_written_at,
    lastUpdatedAt: v.last_updated_at,
  }))
}

export function listAdkModels(): Promise<AdkModel[]> {
  return adkRequest<AdkModel[]>(endpoints.adk.models)
}
