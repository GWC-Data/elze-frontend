import type { ContextAccess, ContextAccessLevel, GeneralAccess } from '@/types/metadataLakehouse'

const RANK: Record<ContextAccessLevel, number> = { view: 1, edit: 2, full: 3 }

export const CONTEXT_ACCESS_ORDER: ContextAccessLevel[] = ['view', 'edit', 'full']

export const CONTEXT_ACCESS_LABELS: Record<ContextAccessLevel, string> = {
  view: 'Can view',
  edit: 'Can edit',
  full: 'Full access',
}

export const CONTEXT_ACCESS_HINTS: Record<ContextAccessLevel, string> = {
  view: 'Open the draft and every published version, read-only.',
  edit: 'Also change the draft: datasets, analysis, review and descriptions.',
  full: 'Also delete the context and its published versions.',
}

export const GENERAL_ACCESS_LABELS: Record<GeneralAccess, string> = {
  restricted: 'Restricted',
  company: 'Everyone in the company',
}

export const GENERAL_ACCESS_HINTS: Record<GeneralAccess, string> = {
  restricted: 'Only you, company admins and the people added here can open it.',
  company: 'Everyone in the company can view it. Editing still needs to be shared.',
}

export function accessAtLeast(access: ContextAccess | null | undefined, required: ContextAccessLevel): boolean {
  return Boolean(access) && RANK[access!.level] >= RANK[required]
}
