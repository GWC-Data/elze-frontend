import type { FeatureId } from '@/types/admin'

// Mirror of backend/src/constants/features.ts, for display only: which feature a permission
// belongs to and what it is called. The server decides access; this only lets the app say
// "your company does not have Agents" instead of "your role does not allow this". Keep the
// two files in step when a permission or feature is added.

export const FEATURE_LABELS: Record<FeatureId, string> = {
  metadata_lakehouse: 'Metadata Lakehouse',
  data_analyst: 'Data analyst agent',
  agents: 'Agents',
  dashboards: 'Dashboards',
}

const FEATURE_PREFIXES: Array<[string, FeatureId]> = [
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

export function featureOfPermission(permission: string): FeatureId | null {
  const hit = FEATURE_PREFIXES.find(([prefix]) => permission.startsWith(prefix))
  return hit ? hit[1] : null
}
