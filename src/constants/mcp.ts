export const MCP_CONFIG = {
  serverUrl: 'http://test/mcp',
  transport: 'Streamable HTTP',
  serverNamePrefix: 'context',
  auth: {
    header: 'Authorization',
    format: 'Bearer <MCP access token>',
    source: 'Issued by your platform administrator.',
  },
  tools: [
    { name: 'list_context_objects', description: 'List the facts recorded for this connection, filterable by type.' },
    { name: 'get_context_object', description: 'Read one fact by id or qualified name.' },
    { name: 'search_context_objects', description: 'Semantic search over the facts.' },
    { name: 'query_sql', description: 'Read-only SELECT / WITH over the context store, scoped to the workspace.' },
  ],
} as const

export function mcpServerName(connectionName: string): string {
  const slug = connectionName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return `${MCP_CONFIG.serverNamePrefix}-${slug || 'layer'}`
}

export function mcpClientConfig(connectionName: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        [mcpServerName(connectionName)]: {
          type: 'http',
          url: MCP_CONFIG.serverUrl,
          headers: { [MCP_CONFIG.auth.header]: MCP_CONFIG.auth.format },
        },
      },
    },
    null,
    2
  )
}
