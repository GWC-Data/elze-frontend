import { contextHttp } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type {
  ContextAccessLevel,
  ContextLevelDef,
  ContextShareGroup,
  ContextSharePerson,
  ContextSharing,
  GeneralAccess,
} from '@/types/metadataLakehouse'

let levelCache: ContextLevelDef[] | null = null

function remember(sharing: ContextSharing): ContextSharing {
  if (sharing.levels?.length) levelCache = sharing.levels
  return sharing
}

async function contextLevelId(connectionId: string, level: ContextAccessLevel): Promise<string> {
  const levels = levelCache ?? remember(await contextHttp.get<ContextSharing>(endpoints.context.access(connectionId))).levels
  const match = levels.find((l) => l.key === level)
  if (!match) throw new Error(`Unknown context access level "${level}"`)
  return match.id
}

export async function fetchContextSharing(connectionId: string): Promise<ContextSharing> {
  return remember(await contextHttp.get<ContextSharing>(endpoints.context.access(connectionId)))
}

export function listShareablePeople(connectionId: string): Promise<ContextSharePerson[]> {
  return contextHttp.get<ContextSharePerson[]>(endpoints.context.accessPeople(connectionId))
}

export async function shareContext(connectionId: string, userId: number, level: ContextAccessLevel): Promise<ContextSharing> {
  const levelId = await contextLevelId(connectionId, level)
  return remember(await contextHttp.put<ContextSharing>(endpoints.context.accessUser(connectionId, userId), { levelId }))
}

export async function unshareContext(connectionId: string, userId: number): Promise<ContextSharing> {
  return remember(await contextHttp.delete<ContextSharing>(endpoints.context.accessUser(connectionId, userId)))
}

export function listShareableGroups(connectionId: string): Promise<ContextShareGroup[]> {
  return contextHttp.get<ContextShareGroup[]>(endpoints.context.accessGroups(connectionId))
}

export async function shareContextWithGroup(
  connectionId: string,
  groupId: number,
  level: ContextAccessLevel
): Promise<ContextSharing> {
  const levelId = await contextLevelId(connectionId, level)
  return remember(await contextHttp.put<ContextSharing>(endpoints.context.accessGroup(connectionId, groupId), { levelId }))
}

export async function unshareContextWithGroup(connectionId: string, groupId: number): Promise<ContextSharing> {
  return remember(await contextHttp.delete<ContextSharing>(endpoints.context.accessGroup(connectionId, groupId)))
}

export async function setGeneralAccess(connectionId: string, generalAccess: GeneralAccess): Promise<ContextSharing> {
  return remember(await contextHttp.put<ContextSharing>(endpoints.context.accessGeneral(connectionId), { generalAccess }))
}
