export const contextKeys = {
  all: ['context'] as const,

  connectors: () => [...contextKeys.all, 'connectors'] as const,

  companyPublished: () => [...contextKeys.all, 'companyPublished'] as const,

  factsByTable: (connectionId: string) => [...contextKeys.all, 'factsByTable', connectionId] as const,

  versions: (connectionId: string) => [...contextKeys.all, 'versions', connectionId] as const,

  connections: () => [...contextKeys.all, 'connections'] as const,
  connection: (id: string) => [...contextKeys.connections(), id] as const,

  datasets: (connectionId: string, limit?: number) =>
    [...contextKeys.all, 'datasets', connectionId, limit ?? 'default'] as const,
  datasetsAll: (connectionId: string) =>
    [...contextKeys.all, 'datasets', connectionId] as const,

  contextProfile: (connectionId: string) => [...contextKeys.all, 'context-profile', connectionId] as const,

  profile: (connectionId: string) => [...contextKeys.all, 'profile', connectionId] as const,
  tableProfile: (connectionId: string, tableId: string) =>
    [...contextKeys.profile(connectionId), 'table', tableId] as const,

  contextObjects: (connectionId: string) =>
    [...contextKeys.all, 'context-objects', connectionId] as const,

  understanding: (connectionId: string) =>
    [...contextKeys.all, 'understanding', connectionId] as const,

  extraction: (connectionId: string) =>
    [...contextKeys.all, 'extraction', connectionId] as const,


  model: (connectionId: string) => [...contextKeys.all, 'model', connectionId] as const,

  review: (connectionId: string) => [...contextKeys.all, 'review', connectionId] as const,
  reviewFiltered: (connectionId: string, filters: object) =>
    [...contextKeys.review(connectionId), filters] as const,

  publish: (connectionId: string) => [...contextKeys.all, 'publish', connectionId] as const,

  sharing: (connectionId: string) => [...contextKeys.all, 'sharing', connectionId] as const,
  shareablePeople: (connectionId: string) =>
    [...contextKeys.sharing(connectionId), 'people'] as const,
  publishSummary: (connectionId: string) =>
    [...contextKeys.publish(connectionId), 'summary'] as const,
}
