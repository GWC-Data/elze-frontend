// 'playbook_builder' is never a path segment (it has its own dedicated session
// surface, not the generic /agents/{agent_name}/ one) but its sessions' own
// response bodies carry it as this same discriminator field.
export type AdkAgentName = 'data_analyst' | 'context_layer_extractor' | 'playbook_builder'

export interface AdkSessionSummary {
  sessionId: string
  workspaceId: string
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
  datasetIds?: string[]
  domain?: string
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

// Usage stats are agent/provider-specific (token counts, turn counts, ...) — the
// service returns a free-form object, so this stays a loose record rather than a
// fixed shape.
export type AdkSessionUsage = Record<string, unknown>

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
