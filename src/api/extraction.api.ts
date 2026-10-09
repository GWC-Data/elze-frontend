import {
  createContextLayerSession,
  getAdkSession,
  triggerContextLayer,
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

export interface ExtractionTarget {
  versionId: string
  contextName: string
  contextDescription?: string | null
  datasetIds: string[]
}

export async function runExtraction(contextId: string, target: ExtractionTarget): Promise<ExtractionResult> {
  const session = await createContextLayerSession(contextId, {
    versionId: target.versionId,
    contextName: target.contextName,
    contextDescription: target.contextDescription,
    datasetIds: target.datasetIds,
  })

  const { success } = await triggerContextLayer(contextId, session.sessionId)
  if (!success) throw new Error('The context extraction was interrupted before it finished.')

  const report = await fetchExtractionSession(contextId, session.sessionId).catch(() => null)

  return {
    sessionId: session.sessionId,
    text: report?.text ?? '',
    toolCalls: [],
    interrupted: false,
    datasetIds: target.datasetIds,
  }
}

export async function fetchExtractionSession(
  contextId: string,
  sessionId: string
): Promise<ExtractionResult | null> {
  const detail = await getAdkSession(contextId, AGENT, sessionId)
  const answer = [...detail.turns].reverse().find((turn) => turn.role !== 'user')
  if (!answer || !answer.text.trim()) return null

  return {
    sessionId,
    text: answer.text,
    toolCalls: [],
    interrupted: false,
  }
}
