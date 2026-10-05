import { contextHttp } from '@/api/client'
import { endpoints, versionParams } from '@/api/endpoints'
import type {
  Connection,
  Connector,
  ContextProfile,
  CreatedConnection,
  PublishedConnection,
  PublishedContextOption,
} from '@/types/metadataLakehouse'

export function listConnectors(): Promise<Connector[]> {
  return contextHttp.get<Connector[]>(endpoints.context.connectors())
}

export function listConnections(): Promise<Connection[]> {
  return contextHttp.get<Connection[]>(endpoints.context.connections())
}

export function listPublishedConnections(): Promise<PublishedConnection[]> {
  return contextHttp.get<PublishedConnection[]>(endpoints.context.publishedConnections())
}

export function listPublishedContexts(): Promise<PublishedContextOption[]> {
  return contextHttp.get<PublishedContextOption[]>(endpoints.context.publishedContexts())
}

export function getConnection(id: string, version?: string | null): Promise<Connection> {
  return contextHttp.get<Connection>(endpoints.context.connection(id), { params: versionParams(version) })
}

export function createConnection(body: {
  provider: string
  name: string
  host: string
  token: string
  companyId?: number
  limit?: number
}): Promise<CreatedConnection> {
  return contextHttp.post<CreatedConnection>(endpoints.context.connections(), body)
}

export function getContextProfile(id: string): Promise<ContextProfile | null> {
  return contextHttp.get<ContextProfile | null>(endpoints.context.contextProfile(id))
}

export function saveContextProfile(id: string, body: { name: string; description: string }): Promise<ContextProfile> {
  return contextHttp.put<ContextProfile>(endpoints.context.contextProfile(id), body)
}

export function verifyConnection(id: string): Promise<{ connection: Connection }> {
  return contextHttp.post<{ connection: Connection }>(endpoints.context.verifyConnection(id))
}

export function deleteConnection(id: string): Promise<{ deleted: true }> {
  return contextHttp.delete<{ deleted: true }>(endpoints.context.connection(id))
}
