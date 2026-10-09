import { createContext, useContext } from 'react'
import type { ContextAccess, WorkflowStepId } from '@/types/metadataLakehouse'

export const WORKFLOW_STEPS: ReadonlyArray<{
  id: WorkflowStepId
  label: string
  description: string
}> = [
  { id: 'connect', label: 'Connect', description: 'Select a data source' },
  { id: 'context', label: 'Context', description: 'Name this context' },
  { id: 'discover', label: 'Discover', description: 'Select datasets' },
  { id: 'profile', label: 'Profile', description: 'Tables & schema' },
  { id: 'understand', label: 'Understand', description: 'AI generated insights' },
  { id: 'model', label: 'Model', description: 'Relationships' },
  { id: 'review', label: 'Review', description: 'Approve and edit' },
  { id: 'publish', label: 'Publish', description: 'Finalize and publish' },
]

const STEP_INDEX = new Map(WORKFLOW_STEPS.map((s, i) => [s.id, i]))

export function stepIndex(id: WorkflowStepId): number {
  return STEP_INDEX.get(id) ?? 0
}

export interface WorkflowState {
  connectionId: string | null
  setConnectionId: (id: string | null) => void

  versionId: string | null
  readOnly: boolean
  access: ContextAccess | null

  step: WorkflowStepId
  goToStep: (id: WorkflowStepId) => void
  next: () => void
  back: () => void

  furthestStep: WorkflowStepId
  canEnter: (id: WorkflowStepId) => boolean

  selectedDatasetIds: string[] | null
  setSelectedDatasetIds: (ids: string[]) => void

  activeTableId: string | null
  setActiveTableId: (id: string | null) => void
}

export const WorkflowContext = createContext<WorkflowState | null>(null)

export function useViewVersionId(): string | null {
  return useContext(WorkflowContext)?.versionId ?? null
}

export function useWorkflow(): WorkflowState {
  const ctx = useContext(WorkflowContext)
  if (!ctx) throw new Error('useWorkflow must be used inside <WorkflowProvider>')
  return ctx
}
