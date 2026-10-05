import {
  createAdkSession,
  getAdkSession,
  listAdkSessions,
  sendAdkMessage,
} from '@/api/adk.api'

const AGENT = 'context_layer_extractor' as const

export interface ExtractionResult {
  sessionId: string
  text: string
  toolCalls: string[]
  interrupted: boolean
  datasetIds?: string[] | null
  extractedAt?: string | null
}

export async function runExtraction(
  connectionId: string,
  datasetIds: string[],
  options: { domain?: string } = {}
): Promise<ExtractionResult> {
  const session = await createAdkSession(connectionId, AGENT)

  const response = await sendAdkMessage(connectionId, AGENT, session.sessionId, {
    text: '',
    datasetIds,
    ...(options.domain ? { domain: options.domain } : {}),
  })

  return {
    sessionId: session.sessionId,
    text: response.text,
    toolCalls: response.toolCalls,
    interrupted: response.interrupted,
  }
}

export async function fetchLatestExtraction(
  connectionId: string
): Promise<ExtractionResult | null> {
  const sessions = await listAdkSessions(connectionId, AGENT)
  if (!sessions.length) return null

  const latest = [...sessions].sort(
    (a, b) => (b.lastUpdateTime ?? 0) - (a.lastUpdateTime ?? 0)
  )[0]

  return fetchExtractionSession(connectionId, latest.sessionId)
}

export async function fetchExtractionSession(
  connectionId: string,
  sessionId: string
): Promise<ExtractionResult | null> {
  const detail = await getAdkSession(connectionId, AGENT, sessionId)
  const answer = [...detail.turns].reverse().find((turn) => turn.role !== 'user')
  if (!answer || !answer.text.trim()) return null

  return {
    sessionId,
    text: answer.text,
    toolCalls: [],
    interrupted: false,
  }
}
