import type { LibraryAgent } from '@/types/agentLibrary'

export function agentAccess(
  agent: LibraryAgent,
  userId: number | undefined,
  can: (permission: string) => boolean
): { edit: boolean; remove: boolean; schedule: boolean } {
  const mine = agent.ownerId == null || agent.ownerId === userId
  const any = can('agent.manage_all')
  return {
    edit: can('agent.update') && (mine || any),
    remove: can('agent.delete') && (mine || any),
    schedule: can('agent.schedule') && (mine || any),
  }
}
