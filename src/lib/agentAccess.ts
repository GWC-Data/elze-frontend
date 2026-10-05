import type { LibraryAgent } from '@/types/agentLibrary'

// What the signed-in account may do with one library agent (check 3 of the access rules:
// feature → role permission → this item). agent.update / agent.delete / agent.schedule
// cover the agents you created; agent.manage_all covers everyone's in the company.
// An agent with no recorded owner predates ownership and is treated as yours.
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
