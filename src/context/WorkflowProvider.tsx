import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { WorkflowStepId } from '@/types/metadataLakehouse'
import { useConnectionAccess } from '@/hooks/useMetadataLakehouse'
import { accessAtLeast } from '@/lib/contextAccess'
import {
  WORKFLOW_STEPS,
  WorkflowContext,
  stepIndex,
  type WorkflowState,
} from '@/context/workflowContext'

export function WorkflowProvider({
  children,
  initialConnectionId = null,
  versionId = null,
  canCreate = true,
  initialStep,
  initialFurthest,
}: {
  children: ReactNode
  initialConnectionId?: string | null
  versionId?: string | null
  canCreate?: boolean
  initialStep?: WorkflowStepId
  initialFurthest?: WorkflowStepId
}) {
  const [connectionId, setConnectionIdRaw] = useState<string | null>(initialConnectionId)
  const viewing = Boolean(versionId && initialConnectionId)
  const resumeAt = initialConnectionId && initialStep ? initialStep : null
  const [step, setStep] = useState<WorkflowStepId>(
    viewing ? 'understand' : resumeAt ?? (initialConnectionId ? 'context' : 'connect')
  )
  const [furthestStep, setFurthestStep] = useState<WorkflowStepId>(() => {
    if (viewing) return 'publish'
    if (!initialConnectionId) return 'connect'
    const reach = initialFurthest ?? resumeAt ?? 'context'
    return stepIndex(reach) >= stepIndex(resumeAt ?? 'context') ? reach : (resumeAt ?? 'context')
  })
  const access = useConnectionAccess(connectionId)
  const canWrite = connectionId ? accessAtLeast(access, 'edit') : canCreate
  const readOnly = viewing || !canWrite
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[] | null>(null)
  const [activeTableId, setActiveTableId] = useState<string | null>(null)

  const setConnectionId = useCallback((id: string | null) => {
    setConnectionIdRaw((current) => {
      if (current !== id) {
        setSelectedDatasetIds(null)
        setActiveTableId(null)
      }
      return id
    })
  }, [])

  const goToStep = useCallback((id: WorkflowStepId) => {
    setStep(id)
    setFurthestStep((furthest) => (stepIndex(id) > stepIndex(furthest) ? id : furthest))
  }, [])

  const next = useCallback(() => {
    setStep((current) => {
      const target =
        WORKFLOW_STEPS[Math.min(stepIndex(current) + 1, WORKFLOW_STEPS.length - 1)]
      setFurthestStep((furthest) =>
        stepIndex(target.id) > stepIndex(furthest) ? target.id : furthest
      )
      return target.id
    })
  }, [])

  const back = useCallback(() => {
    setStep((current) => WORKFLOW_STEPS[Math.max(stepIndex(current) - 1, 0)].id)
  }, [])

  const canEnter = useCallback(
    (id: WorkflowStepId) => stepIndex(id) <= stepIndex(furthestStep),
    [furthestStep]
  )

  const value = useMemo<WorkflowState>(
    () => ({
      connectionId,
      setConnectionId,
      versionId: viewing ? versionId : null,
      readOnly,
      access,
      step,
      goToStep,
      next,
      back,
      furthestStep,
      canEnter,
      selectedDatasetIds,
      setSelectedDatasetIds,
      activeTableId,
      setActiveTableId,
    }),
    [
      connectionId,
      setConnectionId,
      viewing,
      versionId,
      readOnly,
      access,
      step,
      goToStep,
      next,
      back,
      furthestStep,
      canEnter,
      selectedDatasetIds,
      activeTableId,
    ]
  )

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>
}
