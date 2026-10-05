export const AI_TEXT_KEYS = ['description', 'note', 'logic_summary', 'definition', 'basis'] as const

export function isAiText(key: string): boolean {
  return (AI_TEXT_KEYS as readonly string[]).includes(key)
}

const LABELS: Record<string, string> = {
  description: 'Description',
  note: 'Note',
  data_type: 'Data type',
  null_rate: 'Null rate',
  distinct_count_est: 'Distinct values',
  row_count: 'Rows',
  primary_key: 'Primary key',
  foreign_keys: 'Foreign keys',
  logic_summary: 'What it does',
  input_tables: 'Reads from',
  output_table: 'Writes to',
  last_run_status: 'Last run',
  schedule: 'Schedule',
  owner: 'Owner',
  formula: 'Formula',
  cardinality: 'Cardinality',
  join_keys: 'Join keys',
  basis: 'Basis',
}

export function labelFor(key: string): string {
  if (LABELS[key]) return LABELS[key]
  const words = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function text(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key]
  return typeof value === 'string' && value.trim() ? value : null
}
