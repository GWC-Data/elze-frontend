import { Checkbox } from '@/components/ui/checkbox'
import { Hint } from '@/components/common/Hint'
import { FEATURE_LABELS } from '@/constants/features'
import { cn } from '@/lib/utils'
import type { FeatureId, RolePermissionOption } from '@/types/admin'

const THINGS: Record<string, string> = {
  context: 'Metadata Lakehouse',
  analyst: 'Data analyst',
  playbook: 'Playbooks',
  agent: 'Agents',
  dashboard: 'Dashboards',
  data: 'Data sources',
  access: 'Dashboard sharing',
  scope: 'Data scopes',
  company: 'Company settings',
  user: 'Members',
  group: 'Groups',
  role: 'Roles',
}

const COLUMNS = ['View', 'Create', 'Edit', 'Delete'] as const
type Column = (typeof COLUMNS)[number]

function columnOf(action: string): Column | null {
  if (action === 'read' || action === 'use') return 'View'
  if (action === 'create') return 'Create'
  if (action === 'update' || action === 'edit') return 'Edit'
  if (action === 'delete') return 'Delete'
  return null
}

interface Row {
  thing: string
  label: string
  feature: FeatureId | null
  featureEnabled: boolean
  cells: Partial<Record<Column, RolePermissionOption>>
  more: RolePermissionOption[]
  view: RolePermissionOption | null
}

function buildRows(options: RolePermissionOption[]): Row[] {
  const rows = new Map<string, Row>()
  for (const option of options) {
    if (option.adminOnly) continue
    const [thing, action] = option.id.split('.')
    let row = rows.get(thing)
    if (!row) {
      row = {
        thing,
        label: THINGS[thing] ?? thing,
        feature: option.feature,
        featureEnabled: option.featureEnabled,
        cells: {},
        more: [],
        view: null,
      }
      rows.set(thing, row)
    }
    const column = columnOf(action)
    if (column) row.cells[column] = option
    else row.more.push(option)
    if (column === 'View') row.view = option
  }
  return [...rows.values()]
}

function toggleWithImplications(
  current: ReadonlySet<string>,
  options: RolePermissionOption[],
  id: string,
  on: boolean
): Set<string> {
  const next = new Set(current)
  const thing = id.split('.')[0]
  const view = options.find((o) => o.id.startsWith(`${thing}.`) && ['read', 'use'].includes(o.id.split('.')[1]))
  if (on) {
    next.add(id)
    if (view && view.id !== id) next.add(view.id)
  } else {
    next.delete(id)
    if (view && view.id === id) {
      for (const o of options) if (o.id.startsWith(`${thing}.`)) next.delete(o.id)
    }
  }
  return next
}

function Cell({
  option,
  checked,
  disabled,
  onChange,
}: {
  option: RolePermissionOption | undefined
  checked: boolean
  disabled: boolean
  onChange: (on: boolean) => void
}) {
  if (!option) return <span className="text-muted-foreground/40">—</span>
  return (
    <Hint label={option.description}>
      <span className="inline-flex">
        <Checkbox
          checked={checked}
          disabled={disabled || !option.assignable}
          onCheckedChange={(value) => onChange(value === true)}
          aria-label={option.label}
        />
      </span>
    </Hint>
  )
}

export function PermissionGrid({
  options,
  selected,
  onChange,
  readOnly = false,
}: {
  options: RolePermissionOption[]
  selected: ReadonlySet<string>
  onChange?: (next: Set<string>) => void
  readOnly?: boolean
}) {
  const rows = buildRows(options)
  const set = (id: string, on: boolean) => onChange?.(toggleWithImplications(selected, options, id, on))

  const order: Array<FeatureId | null> = ['metadata_lakehouse', 'data_analyst', 'agents', 'dashboards', null]

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Area</th>
            {COLUMNS.map((c) => (
              <th key={c} className="w-20 px-2 py-2 text-center font-medium">
                {c}
              </th>
            ))}
            <th className="px-3 py-2 text-left font-medium">More</th>
          </tr>
        </thead>
        {order.map((feature) => {
          const group = rows.filter((r) => r.feature === feature)
          if (!group.length) return null
          const enabled = group[0].featureEnabled
          return (
            <tbody key={feature ?? 'core'} className="border-t border-border">
              <tr>
                <th colSpan={COLUMNS.length + 2} className="px-3 pt-3 pb-1 text-left text-xs font-semibold uppercase tracking-wide text-primary">
                  {feature ? FEATURE_LABELS[feature] : 'Company'}
                  {!enabled ? (
                    <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground">
                      Not enabled for your company
                    </span>
                  ) : null}
                </th>
              </tr>
              {group.map((row) => (
                <tr key={row.thing} className={cn(!row.featureEnabled && 'opacity-50')}>
                  <td className="px-3 py-2 text-foreground">{row.label}</td>
                  {COLUMNS.map((c) => {
                    const option = row.cells[c]
                    return (
                      <td key={c} className="px-2 py-2 text-center">
                        <Cell
                          option={option}
                          checked={option ? selected.has(option.id) : false}
                          disabled={readOnly || !row.featureEnabled}
                          onChange={(on) => option && set(option.id, on)}
                        />
                      </td>
                    )
                  })}
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {row.more.map((option) => (
                        <label key={option.id} className="inline-flex items-center gap-1.5 text-xs text-foreground">
                          <Cell
                            option={option}
                            checked={selected.has(option.id)}
                            disabled={readOnly || !row.featureEnabled}
                            onChange={(on) => set(option.id, on)}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          )
        })}
      </table>
    </div>
  )
}
