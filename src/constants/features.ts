import type { FeatureKey } from '@/types/admin'

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  metadata_lakehouse: 'Metadata Lakehouse',
  data_analyst: 'Data analyst agent',
  agents: 'Agents',
  dashboards: 'Dashboards',
}

const FEATURE_PREFIXES: Array<[string, FeatureKey]> = [
  ['context.', 'metadata_lakehouse'],
  ['analyst.', 'data_analyst'],
  ['playbook.', 'data_analyst'],
  ['agent.', 'agents'],
  ['dashboard.read', 'dashboards'],
  ['dashboard.create', 'dashboards'],
  ['dashboard.update', 'dashboards'],
  ['dashboard.delete', 'dashboards'],
  ['data.', 'dashboards'],
  ['access.', 'dashboards'],
  ['scope.', 'dashboards'],
]

export function featureOfPermission(permission: string): FeatureKey | null {
  const hit = FEATURE_PREFIXES.find(([prefix]) => permission.startsWith(prefix))
  return hit ? hit[1] : null
}
