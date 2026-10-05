import { Check, Lock } from 'lucide-react'
import { WORKFLOW_STEPS, stepIndex, useWorkflow } from '@/context/workflowContext'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { WorkflowStepId } from '@/types/metadataLakehouse'

type StepState = 'complete' | 'current' | 'locked' | 'upcoming'

function stepHint(state: StepState, blockingLabel: string | null): string {
  if (state === 'current') return 'You are here.'
  if (state === 'complete') return 'Completed — select to revisit this step.'
  if (state === 'locked' && blockingLabel) {
    return `Complete “${blockingLabel}” to proceed to this step.`
  }
  return 'Not started yet.'
}

export function Stepper() {
  const { step, furthestStep, canEnter, goToStep } = useWorkflow()
  const currentIndex = stepIndex(step)
  const furthestIndex = stepIndex(furthestStep)

  const blockingLabel = WORKFLOW_STEPS[furthestIndex]?.label ?? null

  const stateFor = (index: number, id: WorkflowStepId): StepState => {
    if (id === step) return 'current'
    if (index < currentIndex || index <= furthestIndex) return 'complete'
    return canEnter(id) ? 'upcoming' : 'locked'
  }

  return (
    <nav aria-label="Metadata Lakehouse progress" className="w-full">
      <ol className="flex w-full items-center">
        {WORKFLOW_STEPS.map((s, i) => {
          const state = stateFor(i, s.id)
          const reachable = canEnter(s.id)
          const hint = stepHint(state, state === 'locked' ? blockingLabel : null)

          return (
            <li key={s.id} className="flex flex-1 items-center last:flex-none">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => reachable && goToStep(s.id)}
                    aria-current={state === 'current' ? 'step' : undefined}
                    aria-label={`Step ${i + 1}: ${s.label}. ${hint}`}
                    className={cn(
                      'group flex items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors',
                      reachable ? 'cursor-pointer' : 'cursor-not-allowed',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    )}
                  >
                    <span
                      className={cn(
                        'relative flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors',
                        state === 'current' &&
                          'border-primary bg-primary text-primary-foreground',
                        state === 'complete' && 'border-primary/40 bg-primary/10 text-primary',
                        (state === 'locked' || state === 'upcoming') &&
                          'border-border bg-background text-muted-foreground'
                      )}
                    >
                      {state === 'complete' ? (
                        <Check className="size-3.5" aria-hidden />
                      ) : state === 'locked' ? (
                        <Lock className="size-3" aria-hidden />
                      ) : (
                        i + 1
                      )}
                    </span>

                    <span className="hidden min-w-0 flex-col md:flex">
                      <span
                        className={cn(
                          'truncate text-xs font-medium leading-tight',
                          state === 'current' ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {s.label}
                      </span>
                      <span className="truncate text-[11px] leading-tight text-muted-foreground/70">
                        {s.description}
                      </span>
                    </span>
                  </button>
                </TooltipTrigger>

                <TooltipContent side="bottom" className="max-w-[240px]">
                  <p className={cn('text-xs', state === 'locked' && 'text-amber-300')}>{hint}</p>
                </TooltipContent>
              </Tooltip>

              {i < WORKFLOW_STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    'mx-2 h-px flex-1 transition-colors',
                    i < furthestIndex ? 'bg-primary/40' : 'bg-border'
                  )}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
