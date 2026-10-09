export type AdkAgentName = 'data_analyst' | 'context_layer_extractor' | 'description_editor' | 'playbook_builder'

export interface AdkSessionSummary {
  sessionId: string
  contextId: string
  agentName: AdkAgentName
  lastUpdateTime: number | null
}

export interface AdkChatTurn {
  role: string
  text: string
}

export interface AdkSessionDetail extends AdkSessionSummary {
  state: Record<string, unknown>
  turns: AdkChatTurn[]
}

export interface AdkChatResponse {
  text: string
  toolCalls: string[]
  interrupted: boolean
}

export interface AdkMessageBody {
  text: string
  artifactIds?: string[]
}

export interface AdkSessionOptions {
  initialState?: Record<string, unknown>
  model?: string
}

export interface AdkContextLayerSessionBody {
  versionId: string
  contextName: string
  contextDescription?: string | null
  datasetIds: string[]
  model?: string
}

export interface AdkContextLayerMessageBody {
  text?: string
  artifactIds?: string[]
}

export interface AdkDataAnalystSessionBody extends AdkSessionOptions {
  contextIds?: string[]
  playbookId?: string
}

export interface AdkDescriptionEditorSessionBody extends AdkSessionOptions {
  versionId: string
}

export interface AdkDescriptionEditorMessageBody extends AdkMessageBody {
  rowIds: string[]
}

export interface AdkArtifact {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

export interface AdkInterruptResult {
  interrupted: boolean
  reason: string | null
}

export type AdkSessionUsage = Record<string, unknown>

export interface AdkModel {
  key: string
  label: string
  default: boolean
}

export type AdkPlaybookStatus = 'draft' | 'published'

export interface AdkPlaybookSummary {
  playbookId: string
  name: string
  playbookStatus: AdkPlaybookStatus
  version: number
  updatedAt: string
  publishedAt: string | null
}

export interface AdkPlaybookDetail extends AdkPlaybookSummary {
  markdownContent: string
  createdAt: string
}

export interface AdkContextObject {
  id: string
  contextId: string
  versionId: string
  objectType: string
  qualifiedName: string
  sourceType: string
  verified: boolean
  confidence: number | null
  payload: Record<string, unknown>
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AdkContextObjects {
  contextId: string
  resolvedVersionId: string | null
  objects: AdkContextObject[]
}

export interface AdkContextVersion {
  versionId: string
  objectCount: number
  firstWrittenAt: string
  lastUpdatedAt: string
}
