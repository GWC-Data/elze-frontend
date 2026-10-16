import { notify } from '@/lib/notify'
import { ExtractionStoppedError } from '@/api/extraction.api'
import type { ExtractionResult } from '@/api/extraction.api'

export function reportExtractionError(err: unknown) {
  if (err instanceof ExtractionStoppedError) {
    notify.info('Analysis stopped.', 'Facts saved before you stopped stay in the draft.')
  } else {
    notify.failure('run the context extraction', err)
  }
}

export function reportUnconfirmedExtraction(result: ExtractionResult): boolean {
  if (!result.unconfirmed) return false
  const facts = result.savedFacts ?? 0
  notify.warning(
    'Analysis may not have finished.',
    `The connection closed before the analysis confirmed it finished; ${facts} fact${facts === 1 ? ' was' : 's were'} saved. Review them, or run the analysis again.`
  )
  return true
}
