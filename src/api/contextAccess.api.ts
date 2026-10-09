import { contextHttp } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type {
  ContextAccessLevel,
  ContextSharePerson,
  ContextSharing,
  GeneralAccess,
} from '@/types/metadataLakehouse'

export function fetchContextSharing(connectionId: string): Promise<ContextSharing> {
  return contextHttp.get<ContextSharing>(endpoints.context.access(connectionId))
}

export function listShareablePeople(connectionId: string): Promise<ContextSharePerson[]> {
  return contextHttp.get<ContextSharePerson[]>(endpoints.context.accessPeople(connectionId))
}

export function shareContext(connectionId: string, userId: number, level: ContextAccessLevel): Promise<ContextSharing> {
  return contextHttp.put<ContextSharing>(endpoints.context.accessUser(connectionId, userId), { level })
}

export function unshareContext(connectionId: string, userId: number): Promise<ContextSharing> {
  return contextHttp.delete<ContextSharing>(endpoints.context.accessUser(connectionId, userId))
}

export function setGeneralAccess(connectionId: string, generalAccess: GeneralAccess): Promise<ContextSharing> {
  return contextHttp.put<ContextSharing>(endpoints.context.accessGeneral(connectionId), { generalAccess })
}
