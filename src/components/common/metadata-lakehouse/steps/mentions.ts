import type { Fact } from '@/api/contextObjects.api'

export interface MentionRow {
  id: string
  label: string
  fullName: string
  kind: 'table' | 'column'
}

export type DatasetNames = ReadonlyMap<string, string>

const UUID = '[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}'
const BARE_ID = new RegExp(`^(?:domo\\.)?(${UUID})$`, 'i')
const ID_SUFFIX = new RegExp(`\\s*\\((?:${UUID}|[0-9a-f]{8})\\)\\s*$`, 'i')

function withoutId(name: string): string {
  return name.replace(ID_SUFFIX, '').trim()
}

export function tableLabel(table: Fact, datasetNames?: DatasetNames): string {
  const own = table.payload.name
  if (typeof own === 'string' && own.trim()) return withoutId(own) || own
  const bare = BARE_ID.exec(table.qualifiedName)
  if (bare) {
    const dataset = typeof table.payload.dataset_id === 'string' ? table.payload.dataset_id : bare[1]
    const name = datasetNames?.get(dataset.toLowerCase())
    if (name) return withoutId(name) || name
  }
  return withoutId(table.qualifiedName) || table.qualifiedName
}

export function tableMention(table: Fact, datasetNames?: DatasetNames): MentionRow {
  return { id: table.id, label: tableLabel(table, datasetNames), fullName: table.qualifiedName, kind: 'table' }
}

export function columnMention(column: Fact, tableQualifiedName: string): MentionRow {
  const prefix = `${tableQualifiedName}.`
  const label = column.qualifiedName.startsWith(prefix)
    ? column.qualifiedName.slice(prefix.length)
    : column.qualifiedName
  return { id: column.id, label, fullName: column.qualifiedName, kind: 'column' }
}

export interface MentionControls {
  mentions: MentionRow[]
  onToggle: (row: MentionRow) => void
  datasetNames?: DatasetNames
}
