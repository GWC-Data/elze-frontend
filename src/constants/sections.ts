export const SHOW_ANALYTICS = false

export const SHOW_AGENT_LIBRARY = false

const ANALYTICS_PERMISSION_PREFIXES = ['dashboard.', 'data.', 'access.', 'scope.']

const AGENT_LIBRARY_PERMISSION_PREFIXES = ['agent.']

const HIDDEN_PERMISSION_PREFIXES = [
  ...(SHOW_ANALYTICS ? [] : ANALYTICS_PERMISSION_PREFIXES),
  ...(SHOW_AGENT_LIBRARY ? [] : AGENT_LIBRARY_PERMISSION_PREFIXES),
]

const HIDDEN_FEATURES: ReadonlySet<string> = new Set([
  ...(SHOW_ANALYTICS ? [] : ['dashboards']),
  ...(SHOW_AGENT_LIBRARY ? [] : ['agents']),
])

export function isHiddenPermission(permission: string): boolean {
  return HIDDEN_PERMISSION_PREFIXES.some((prefix) => permission.startsWith(prefix))
}

export function isHiddenFeature(feature: string): boolean {
  return HIDDEN_FEATURES.has(feature)
}
