import { Database } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Connector, CredentialField } from '@/types/metadataLakehouse'

export interface ConnectorPresentation {
  id: string
  accentClass: string
  tagline: string
  icon: LucideIcon
  hostLabel: string
}

const PRESENTATION: Record<string, ConnectorPresentation> = {
  domo: {
    id: 'domo',
    accentClass: 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400',
    tagline: 'Connect with an access token',
    icon: Database,
    hostLabel: 'Domo instance',
  },
  snowflake: {
    id: 'snowflake',
    accentClass: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400',
    tagline: 'Account, database, key pair',
    icon: Database,
    hostLabel: 'Account URL',
  },
  databricks: {
    id: 'databricks',
    accentClass: 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400',
    tagline: 'Workspace URL and token',
    icon: Database,
    hostLabel: 'Workspace URL',
  },
  bigquery: {
    id: 'bigquery',
    accentClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
    tagline: 'Project and service account',
    icon: Database,
    hostLabel: 'Project',
  },
  redshift: {
    id: 'redshift',
    accentClass: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400',
    tagline: 'Cluster and credentials',
    icon: Database,
    hostLabel: 'Cluster endpoint',
  },
  postgres: {
    id: 'postgres',
    accentClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400',
    tagline: 'Host, database and role',
    icon: Database,
    hostLabel: 'Host',
  },
}

export function connectorPresentation(id: string): ConnectorPresentation {
  return (
    PRESENTATION[id] ?? {
      id,
      accentClass: 'bg-muted text-muted-foreground',
      tagline: 'Data source',
      icon: Database,
      hostLabel: 'Host',
    }
  )
}

export function isConnectable(connector: Pick<Connector, 'status'>): boolean {
  return connector.status === 'available'
}

export function credentialFields(connector: Connector): CredentialField[] {
  return Array.isArray(connector.credentials) ? connector.credentials : []
}

export function connectorGroups(connectors: Connector[]) {
  const available = connectors.filter(isConnectable)
  const planned = connectors.filter((c) => !isConnectable(c))
  return { available, planned }
}
