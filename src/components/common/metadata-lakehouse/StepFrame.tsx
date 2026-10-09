import { useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { WORKFLOW_STEPS, stepIndex, useWorkflow } from '@/context/workflowContext'
import { BusyOverlay, RefreshingBar } from '@/components/common/metadata-lakehouse/DataStates'

export function StepFrame({
  title,
  description,
  actions,
  headerExtra,
  children,
  nextDisabled,
  nextLabel,
  nextPending,
  onNext,
  hideNext,
  hideBack,
  footerNote,
  pendingLabel = 'Saving…',
  pendingOverlay,
  refreshing = false,
  scrollBody = true,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  headerExtra?: ReactNode
  children: ReactNode
  nextDisabled?: boolean
  nextLabel?: string
  nextPending?: boolean
  onNext?: () => void | boolean | Promise<void | boolean>
  hideNext?: boolean
  hideBack?: boolean
  footerNote?: ReactNode
  pendingLabel?: string
  pendingOverlay?: { title: string; detail?: ReactNode }
  refreshing?: boolean
  scrollBody?: boolean
}) {
  const { step, next, back, readOnly } = useWorkflow()
  const index = stepIndex(step)
  const isFirst = index === 0
  const isLast = index === WORKFLOW_STEPS.length - 1

  const [advancing, setAdvancing] = useState(false)
  const busy = advancing || Boolean(nextPending)

  const handleNext = async () => {
    if (busy) return
    if (onNext && !readOnly) {
      setAdvancing(true)
      let result: void | boolean
      try {
        result = await onNext()
      } finally {
        setAdvancing(false)
      }
      if (result === false) return
    }
    next()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b px-6 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-2xl font-semibold leading-tight tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-[70ch] text-[15px] text-muted-foreground">{description}</p>
          ) : null}
          {footerNote ? (
            <p className="mt-1 text-xs italic text-muted-foreground">{footerNote}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {hideBack || isFirst ? null : (
              <Button variant="outline" size="sm" onClick={back} disabled={busy}>
                <ArrowLeft className="size-4" aria-hidden />
                Back
              </Button>
            )}
            {hideNext || isLast ? null : (
              <Button size="sm" onClick={handleNext} disabled={(!readOnly && nextDisabled) || busy}>
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    {pendingLabel}
                  </>
                ) : (
                  <>
                    {readOnly ? 'Next' : (nextLabel ?? 'Next')}
                    <ArrowRight className="size-4" aria-hidden />
                  </>
                )}
              </Button>
            )}
          </div>
          {headerExtra}
        </div>
      </header>

      <div className={cn('relative min-h-0 flex-1 px-6 py-6', scrollBody && 'overflow-auto')}>
        <RefreshingBar active={refreshing && !busy} />
        {children}
        {busy && pendingOverlay && !readOnly ? (
          <BusyOverlay title={pendingOverlay.title} detail={pendingOverlay.detail} />
        ) : null}
      </div>
    </div>
  )
}
