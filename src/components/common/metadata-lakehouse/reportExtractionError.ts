import { notify } from '@/lib/notify'
import { ExtractionStoppedError } from '@/api/extraction.api'

export function reportExtractionError(err: unknown) {
  if (err instanceof ExtractionStoppedError) {
    notify.info('Analysis stopped.', 'Facts saved before you stopped stay in the draft.')
  } else {
    notify.failure('run the context extraction', err)
  }
}
