import type { AccessLevel, RoleName } from '@/types/auth'

export const ROLE_LABELS: Record<RoleName, string> = {
  SUPER_ADMIN: 'Platform owner',
  COMPANY_ADMIN: 'Company admin',
  USER: 'Member',
}

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  SUPER_ADMIN: 'Runs the platform. Manages every customer, and belongs to none of them.',
  COMPANY_ADMIN:
    'Runs this company. Adds people, creates groups, and decides who sees which dashboards.',
  USER: 'Uses the dashboards they are given. Sees no administration.',
}

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  view: 'Can view',
  share: 'Can share',
  developer: 'Can edit',
  admin: 'Full control',
}

export const ACCESS_LEVEL_ORDER: AccessLevel[] = ['view', 'share', 'developer', 'admin']

export function levelAtLeast(level: AccessLevel | null | undefined, required: AccessLevel): boolean {
  if (!level) return false
  return ACCESS_LEVEL_ORDER.indexOf(level) >= ACCESS_LEVEL_ORDER.indexOf(required)
}

export const ACCESS_LEVEL_ABILITIES: Record<AccessLevel, string> = {
  view: 'You can open this dashboard and use its filters.',
  share: 'You can view this dashboard and share it with colleagues (up to "Can share").',
  developer: 'You can view, share and edit the cards on this dashboard.',
  admin: 'You have full control: view, share, edit, remove access and delete this dashboard.',
}
