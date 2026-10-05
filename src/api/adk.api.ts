import { adkRequest } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type {
  AdkAgentName,
  AdkArtifact,
  AdkChatResponse,
  AdkInterruptResult,
  AdkMessageBody,
  AdkPlaybookDetail,
  AdkPlaybookStatus,
  AdkPlaybookSummary,
  AdkSessionDetail,
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
  workspace_id: string
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
    workspaceId: raw.workspace_id,
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

export async function createAdkSession(
  workspaceId: string,
  agentName: AdkAgentName,
  initialState?: Record<string, unknown>
): Promise<AdkSessionSummary> {
  const raw = await adkRequest<RawSessionSummary>(endpoints.adk.sessions(workspaceId, agentName), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initial_state: initialState ?? null }),
  })
  return toSessionSummary(raw)
}

export async function listAdkSessions(
  workspaceId: string,
  agentName: AdkAgentName
): Promise<AdkSessionSummary[]> {
  const raw = await adkRequest<RawSessionSummary[]>(endpoints.adk.sessions(workspaceId, agentName))
  return raw.map(toSessionSummary)
}

export async function getAdkSession(
  workspaceId: string,
  agentName: AdkAgentName,
  sessionId: string
): Promise<AdkSessionDetail> {
  const raw = await adkRequest<RawSessionDetail>(endpoints.adk.session(workspaceId, agentName, sessionId))
  return toSessionDetail(raw)
}

export async function deleteAdkSession(workspaceId: string, agentName: AdkAgentName, sessionId: string): Promise<void> {
  await adkRequest<void>(endpoints.adk.session(workspaceId, agentName, sessionId), { method: 'DELETE' })
}

export async function sendAdkMessage(
  workspaceId: string,
  agentName: AdkAgentName,
  sessionId: string,
  body: AdkMessageBody
): Promise<AdkChatResponse> {
  const payload: Record<string, unknown> = { text: body.text, stream: false }
  if (body.datasetIds) payload.dataset_ids = body.datasetIds
  if (body.domain) payload.domain = body.domain
  if (body.artifactIds) payload.artifact_ids = body.artifactIds

  const raw = await adkRequest<{ text: string; tool_calls?: string[]; interrupted?: boolean }>(
    endpoints.adk.messages(workspaceId, agentName, sessionId),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )
  return {
    text: raw.text ?? '',
    toolCalls: raw.tool_calls ?? [],
    interrupted: Boolean(raw.interrupted),
  }
}

export async function getAdkSessionUsage(
  workspaceId: string,
  agentName: AdkAgentName,
  sessionId: string
): Promise<AdkSessionUsage> {
  return adkRequest<AdkSessionUsage>(endpoints.adk.usage(workspaceId, agentName, sessionId))
}

// Cancels the in-flight /messages call for this session, if any (single-process
// service — see that endpoint's own docstring). The pending sendAdkMessage() call
// still resolves or rejects on its own; this just asks the server to stop early.
export async function interruptAdkSession(
  workspaceId: string,
  agentName: AdkAgentName,
  sessionId: string
): Promise<AdkInterruptResult> {
  return adkRequest<AdkInterruptResult>(endpoints.adk.interrupt(workspaceId, agentName, sessionId), {
    method: 'POST',
  })
}

// No explicit Content-Type: fetch sets the multipart boundary itself from the
// FormData body, which a manual 'multipart/form-data' header would break.
export async function uploadAdkArtifact(
  workspaceId: string,
  agentName: AdkAgentName,
  sessionId: string,
  file: File
): Promise<AdkArtifact> {
  const formData = new FormData()
  formData.append('file', file)
  const raw = await adkRequest<RawArtifact>(endpoints.adk.artifacts(workspaceId, agentName, sessionId), {
    method: 'POST',
    body: formData,
  })
  return toArtifact(raw)
}

export async function listAdkArtifacts(
  workspaceId: string,
  agentName: AdkAgentName,
  sessionId: string
): Promise<AdkArtifact[]> {
  const raw = await adkRequest<RawArtifact[]>(endpoints.adk.artifacts(workspaceId, agentName, sessionId))
  return raw.map(toArtifact)
}

export async function deleteAdkArtifact(
  workspaceId: string,
  agentName: AdkAgentName,
  sessionId: string,
  artifactId: string
): Promise<void> {
  await adkRequest<void>(endpoints.adk.artifact(workspaceId, agentName, sessionId, artifactId), {
    method: 'DELETE',
  })
}

// ------------------------------------------------------------ playbook_builder
// Its own dedicated session surface (main.py) — same session/messages/interrupt/
// usage response shapes as the generic surface above, but not agent_name-scoped
// (there's only ever one) and no artifacts sub-route.

export async function createPlaybookBuilderSession(
  workspaceId: string,
  initialState?: Record<string, unknown>,
  skipKickoff?: boolean
): Promise<AdkSessionSummary> {
  const raw = await adkRequest<RawSessionSummary>(endpoints.adk.playbookBuilderSessions(workspaceId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initial_state: initialState ?? null, skip_kickoff: Boolean(skipKickoff) }),
  })
  return toSessionSummary(raw)
}

export async function listPlaybookBuilderSessions(workspaceId: string): Promise<AdkSessionSummary[]> {
  const raw = await adkRequest<RawSessionSummary[]>(endpoints.adk.playbookBuilderSessions(workspaceId))
  return raw.map(toSessionSummary)
}

export async function getPlaybookBuilderSession(workspaceId: string, sessionId: string): Promise<AdkSessionDetail> {
  const raw = await adkRequest<RawSessionDetail>(endpoints.adk.playbookBuilderSession(workspaceId, sessionId))
  return toSessionDetail(raw)
}

export async function deletePlaybookBuilderSession(workspaceId: string, sessionId: string): Promise<void> {
  await adkRequest<void>(endpoints.adk.playbookBuilderSession(workspaceId, sessionId), { method: 'DELETE' })
}

export async function sendPlaybookBuilderMessage(
  workspaceId: string,
  sessionId: string,
  text: string
): Promise<AdkChatResponse> {
  const raw = await adkRequest<{ text: string; tool_calls?: string[]; interrupted?: boolean }>(
    endpoints.adk.playbookBuilderMessages(workspaceId, sessionId),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, stream: false }),
    }
  )
  return {
    text: raw.text ?? '',
    toolCalls: raw.tool_calls ?? [],
    interrupted: Boolean(raw.interrupted),
  }
}

export async function getPlaybookBuilderSessionUsage(workspaceId: string, sessionId: string): Promise<AdkSessionUsage> {
  return adkRequest<AdkSessionUsage>(endpoints.adk.playbookBuilderUsage(workspaceId, sessionId))
}

export async function interruptPlaybookBuilderSession(
  workspaceId: string,
  sessionId: string
): Promise<AdkInterruptResult> {
  return adkRequest<AdkInterruptResult>(endpoints.adk.playbookBuilderInterrupt(workspaceId, sessionId), {
    method: 'POST',
  })
}

// ------------------------------------------------------------------ playbooks
// Read-only, workspace-level, no billed LLM turn. Publishing/drafting only ever
// happens conversationally, via the playbook_builder agent's own tools.

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
  workspaceId: string,
  status?: AdkPlaybookStatus
): Promise<AdkPlaybookSummary[]> {
  const path = endpoints.adk.playbooks(workspaceId)
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const raw = await adkRequest<{ status: string; count: number; playbooks: RawPlaybookSummary[] }>(`${path}${query}`)
  return raw.playbooks.map(toPlaybookSummary)
}

export async function getAdkPlaybook(workspaceId: string, playbookId: string): Promise<AdkPlaybookDetail> {
  const raw = await adkRequest<RawPlaybookDetail & { status: string }>(endpoints.adk.playbook(workspaceId, playbookId))
  return { ...toPlaybookSummary(raw), markdownContent: raw.markdown_content, createdAt: raw.created_at }
}
