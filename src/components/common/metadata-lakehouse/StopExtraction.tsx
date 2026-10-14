import { Loader2, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notify'
import type { useRunExtraction } from '@/hooks/useMetadataLakehouse'

type ExtractionRun = Pick<ReturnType<typeof useRunExtraction>, 'stop' | 'canStop' | 'stopping'>

export function StopExtractionButton({ run }: { run: ExtractionRun }) {
  const handleStop = async () => {
    try {
      const result = await run.stop()
      if (result && !result.interrupted) {
        notify.warning("Couldn't stop the analysis.", result.reason ?? undefined)
      }
    } catch (err) {
      notify.failure('stop the analysis', err)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleStop} disabled={!run.canStop}>
      {run.stopping ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Square className="size-4" aria-hidden />
      )}
      {run.stopping ? 'Stopping…' : 'Stop analysis'}
    </Button>
  )
}
