import { BarChart3, ChartArea, Gauge, Grid2x2, Plus, TrendingDown, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type {
  CardDefinition,
  CardKind,
  ColumnCatalogue,
  ColumnDef,
  DateGrain,
  Mapping,
} from '@/types/dashboard'
import { cardRegistry, findRegistration } from '@/lib/cardRegistry'
import { Field, Group, IconButton, Notice, Toggle } from '@/components/common/dashboard-editor/editorUi'
import { ROLE_STYLE, inputCls } from '@/constants/editorStyles'
import { AGGS, GRAINS, deriveGroupBy } from '@/lib/cardModel'
import { Hint } from '@/components/common/Hint'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ROLE_OPTIONS: Array<{ value: Mapping; label: string }> = [
  { value: 'XTIME', label: 'Category' },
  { value: 'VALUE', label: 'Value' },
  { value: 'SERIES', label: 'Series' },
  { value: 'ITEM', label: 'Item' },
  { value: 'XVAL', label: 'X value' },
]

const CARD_ICONS: Partial<Record<string, LucideIcon>> = {
  badge: Gauge,
  combo: BarChart3,
  area: ChartArea,
  treemap: Grid2x2,
  funnel: TrendingDown,
}

const FORMAT_STYLES = [
  { value: '', label: 'Plain' },
  { value: 'abbreviated', label: 'Abbreviated' },
  { value: 'compact', label: 'Compact' },
  { value: 'percent', label: 'Percent' },
]

export interface Ctx {
  kind: CardKind
  draft: CardDefinition
  catalogue: ColumnCatalogue | null
  columns: ColumnDef[]
  setCard: (patch: Partial<CardDefinition>) => void
  setColumn: (idx: number, field: keyof ColumnDef, value: unknown) => void
  addColumn: () => void
  removeColumn: (idx: number) => void
  setDateGrain: (grain: DateGrain | undefined) => void
  setOption: (key: string, value: unknown) => void
}

function BadgeNotice({ children }: { children: string }) {
  return <Notice>{children}</Notice>
}

type ChoiceOption = { value: string; label: string }

const EMPTY_CHOICE = '__empty__'

const encodeChoice = (value: string) => (value === '' ? EMPTY_CHOICE : value)

const asOptions = (values: ReadonlyArray<string | number>, label: (value: string) => string = (v) => v) =>
  values.map((v) => ({ value: String(v), label: label(String(v)) }))

function Choice({
  value,
  onChange,
  options = [],
  groups = [],
  placeholder,
  disabled,
  label,
}: {
  value: string
  onChange: (value: string) => void
  options?: ChoiceOption[]
  groups?: Array<{ label: string; options: ChoiceOption[] }>
  placeholder?: string
  disabled?: boolean
  label?: string
}) {
  const known = [...options, ...groups.flatMap((g) => g.options)].some((o) => o.value === value)
  const item = (o: ChoiceOption) => (
    <SelectItem key={encodeChoice(o.value)} value={encodeChoice(o.value)}>
      {o.label}
    </SelectItem>
  )
  return (
    <Select
      value={known ? encodeChoice(value) : ''}
      onValueChange={(next) => onChange(next === EMPTY_CHOICE ? '' : next)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full min-w-0" aria-label={label}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(item)}
        {groups
          .filter((g) => g.options.length > 0)
          .map((g) => (
            <SelectGroup key={g.label}>
              <SelectLabel>{g.label}</SelectLabel>
              {g.options.map(item)}
            </SelectGroup>
          ))}
      </SelectContent>
    </Select>
  )
}

function ColumnSelect({
  value,
  onChange,
  catalogue,
  only,
}: {
  value: string
  onChange: (v: string) => void
  catalogue: ColumnCatalogue | null
  only?: 'measure' | 'dimension'
}) {
  const list = (catalogue?.columns ?? []).filter((c) => !only || c.role === only)
  const known = list.some((c) => c.name === value)
  return (
    <Choice
      value={value}
      onChange={onChange}
      placeholder="Select column"
      label="Column"
      options={asOptions([...(value && !known ? [value] : []), ...list.map((c) => c.name)])}
    />
  )
}

export function DataSourceSection({ catalogue, draft }: Ctx) {
  const rows: Array<[string, string]> = [
    ['Table', catalogue?.table ?? '—'],
    ['Database', catalogue?.database ?? '—'],
    ['Rows', catalogue?.rowCountText ?? '—'],
    ['Columns', catalogue ? String(catalogue.columns.length) : '—'],
    ['Dashboard', catalogue?.dashboardId ?? '—'],
    ['Card ID', draft.id ?? '—'],
  ]
  const parse = Object.entries(catalogue?.dateParse ?? {})

  return (
    <>
      <Group title="Source">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {rows.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{k}</dt>
              <Hint label={v}><dd className="truncate text-[13px] font-medium text-slate-800">
                {v}
              </dd></Hint>
            </div>
          ))}
        </dl>
      </Group>

      {parse.length > 0 && (
        <Group title="Date formats">
          <ul className="space-y-1.5">
            {parse.map(([col, fmt]) => (
              <li key={col} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="truncate text-slate-700">{col}</span>
                <code className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                  {fmt}
                </code>
              </li>
            ))}
          </ul>
        </Group>
      )}
    </>
  )
}

export function FieldsSection(ctx: Ctx) {
  const { kind, columns, catalogue, setColumn, addColumn, removeColumn } = ctx
  const groupBy = deriveGroupBy(columns)

  return (
    <>
      <Group
        title="Fields"
        action={
          <button
            type="button"
            onClick={addColumn}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
          >
            <Plus size={13} />
            Add
          </button>
        }
      >
        {columns.length > 0 && (
          <div className="mb-1.5 grid grid-cols-[1fr_86px_104px_28px] items-center gap-2 px-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Column</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Role</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Aggregate</span>
            <span />
          </div>
        )}

        <div className="space-y-1.5">
          {columns.map((col, i) => {
            const meta = catalogue?.columns.find((c) => c.name === col.column)
            const isValue = (col.mapping ?? 'VALUE') === 'VALUE'
            const badType =
              isValue && meta && !meta.isNumeric && ['SUM', 'AVERAGE'].includes(col.aggregation ?? 'SUM')
            return (
              <div key={i}>
                <div className="grid grid-cols-[1fr_86px_104px_28px] items-center gap-2">
                  <ColumnSelect
                    value={col.column ?? ''}
                    onChange={(v) => setColumn(i, 'column', v)}
                    catalogue={catalogue}
                    only={isValue ? undefined : 'dimension'}
                  />
                  <Choice
                    value={col.mapping ?? 'VALUE'}
                    onChange={(v) => setColumn(i, 'mapping', v)}
                    options={ROLE_OPTIONS}
                    label="Role"
                  />
                  {isValue ? (
                    <Choice
                      value={col.aggregation ?? 'SUM'}
                      onChange={(v) => setColumn(i, 'aggregation', v)}
                      options={asOptions(AGGS)}
                      label="Aggregation"
                    />
                  ) : (
                    <span className="px-1 text-[12px] text-slate-400">Grouped</span>
                  )}
                  <IconButton
                    icon={<Trash2 size={14} />}
                    label="Remove field"
                    tone="danger"
                    onClick={() => removeColumn(i)}
                  />
                </div>
                {badType && <Notice>{meta?.type} column. Use COUNT or COUNTDISTINCT.</Notice>}
              </div>
            )
          })}

          {!columns.length && (
            <p className="rounded-md border border-dashed border-slate-300 py-5 text-center text-[12px] text-slate-400">
              Select a column on the left to begin
            </p>
          )}
        </div>
        {kind === 'kpi' && (
          <BadgeNotice>A badge reads the first Value field; the other roles apply once this card is a chart.</BadgeNotice>
        )}
      </Group>

      <Group title="Grouped by">
        {groupBy.length ? (
          <div className="flex flex-wrap gap-1.5">
            {groupBy.map((g) => (
              <span
                key={g.column}
                className={`rounded px-2 py-1 text-[12px] font-medium ring-1 ${ROLE_STYLE.dimension.chip}`}
              >
                {g.column}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-slate-400">Whole table aggregated as one value</p>
        )}
        {kind === 'kpi' && groupBy.length > 0 && (
          <BadgeNotice>A badge is a single number, so it ignores these groupings.</BadgeNotice>
        )}
      </Group>
    </>
  )
}

export function SortSection({ draft, columns, setCard, setOption, kind }: Ctx) {
  const order = Array.isArray(draft.orderBy) ? draft.orderBy[0] : undefined
  const isFunnel = findRegistration(draft.chartType)?.kind === 'funnel'
  const segments = Number((draft.options ?? {}).funnelSegments ?? 5)
  const measures = columns.filter((c) => (c.mapping ?? 'VALUE') === 'VALUE').map((c) => c.column)
  const sortable = [...deriveGroupBy(columns).map((d) => d.column), ...measures]
  const invalid = order?.column && !sortable.includes(order.column)

  return (
    <Group title="Sort & limit">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sort by">
          <Choice
            value={order?.column ?? ''}
            onChange={(v) =>
              setCard({
                orderBy: v ? [{ column: v, order: order?.order ?? 'DESCENDING' }] : undefined,
              })
            }
            label="Sort by"
            options={[{ value: '', label: 'Highest value first' }, ...asOptions(sortable)]}
          />
        </Field>
        <Field label="Direction">
          <Choice
            disabled={!order?.column}
            value={order?.order ?? 'DESCENDING'}
            onChange={(v) =>
              setCard({
                orderBy: [{ column: order?.column ?? '', order: v as 'ASCENDING' | 'DESCENDING' }],
              })
            }
            label="Direction"
            options={[
              { value: 'DESCENDING', label: 'Descending' },
              { value: 'ASCENDING', label: 'Ascending' },
            ]}
          />
        </Field>
        <Field label="Show top">
          <input
            type="number"
            min={1}
            className={inputCls}
            placeholder="All"
            value={draft.limits ?? ''}
            onChange={(e) =>
              setCard({
                limits: e.target.value === '' ? undefined : Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
        </Field>
        {isFunnel && (
          <Field label="Funnel segments">
            <Choice
              value={String(segments)}
              onChange={(v) => setOption('funnelSegments', Number(v))}
              label="Funnel segments"
              options={asOptions([3, 4, 5, 6, 7, 8, 9, 10])}
            />
          </Field>
        )}
      </div>
      {invalid && <Notice>{order?.column} is not a field on this card.</Notice>}
      {kind === 'kpi' && (
        <BadgeNotice>A badge returns one row, so these are kept for when the card becomes a chart.</BadgeNotice>
      )}
    </Group>
  )
}

export function DateGrainSection({ kind, draft, catalogue, setDateGrain }: Ctx) {
  const grain = draft.dateGrain
  const all = catalogue?.columns ?? []
  const dateish = all.filter((c) => c.isDate || (c.isString && catalogue?.dateParse?.[c.name]))
  const others = all.filter((c) => !dateish.includes(c))
  const chosen = all.find((c) => c.name === grain?.column)
  const parseFmt = grain?.column ? catalogue?.dateParse?.[grain.column] : undefined

  return (
    <Group title={kind === 'kpi' ? 'Comparison period' : 'Time grouping'}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date column">
          <Choice
            value={grain?.column ?? ''}
            onChange={(v) =>
              setDateGrain(v ? { column: v, dateTimeElement: grain?.dateTimeElement ?? 'MONTH' } : undefined)
            }
            label="Date column"
            options={[{ value: '', label: 'None' }]}
            groups={[
              { label: 'Date columns', options: asOptions(dateish.map((c) => c.name)) },
              { label: 'Other columns', options: asOptions(others.map((c) => c.name)) },
            ]}
          />
        </Field>
        <Field label="Group into">
          <Choice
            disabled={!grain?.column}
            value={grain?.dateTimeElement ?? 'MONTH'}
            onChange={(v) => setDateGrain({ column: grain?.column ?? '', dateTimeElement: v })}
            label="Group into"
            options={asOptions(GRAINS, (g) => g.charAt(0) + g.slice(1).toLowerCase())}
          />
        </Field>
      </div>
      {chosen?.isString && !parseFmt && (
        <Notice>{chosen.name} is text with no date format configured.</Notice>
      )}
    </Group>
  )
}

export function CardTypeSection({ draft, setCard }: Ctx) {
  const current = findRegistration(draft.chartType)

  return (
    <Group title="Card type">
      <div className="grid grid-cols-2 gap-2">
        {cardRegistry.map((registration) => {
          const active = current === registration
          const Icon = CARD_ICONS[registration.kind] ?? BarChart3
          return (
            <button
              key={registration.kind}
              type="button"
              onClick={() => setCard({ chartType: registration.chartTypes[0] })}
              className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-[12px] font-medium transition-colors ${
                active
                  ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon size={15} className={active ? 'text-blue-600' : 'text-slate-400'} />
              {registration.label}
            </button>
          )
        })}
      </div>
    </Group>
  )
}

export function ColorSection({ kind, draft, columns, setOption }: Ctx) {
  const isKpi = kind === 'kpi'
  const colorMap = ((draft.options ?? {}).colorMapping as Record<string, string>) ?? {}
  const valueCols = columns.filter((c) => (c.mapping ?? 'VALUE') === 'VALUE').map((c) => c.column)
  const setMap = (next: Record<string, string>) =>
    setOption('colorMapping', Object.keys(next).length ? next : undefined)

  return (
    <>
      <Group
        title={isKpi ? 'Accent colour' : 'Series colours'}
        action={
          <button
            type="button"
            onClick={() => {
              const free = valueCols.find((c) => !(c in colorMap)) ?? ''
              setMap({ ...colorMap, [free]: '#3987e5' })
            }}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
          >
            <Plus size={13} />
            Add
          </button>
        }
      >
        <div className="space-y-1.5">
          {Object.entries(colorMap).map(([key, color]) => (
            <div key={key} className="grid grid-cols-[1fr_44px_28px] items-center gap-2">
              <Choice
                value={key}
                onChange={(v) => {
                  const next = { ...colorMap }
                  delete next[key]
                  if (v) next[v] = color
                  setMap(next)
                }}
                placeholder="Select series"
                label="Series"
                options={asOptions([...(key ? [key] : []), ...valueCols.filter((c) => c !== key)])}
              />
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#898781'}
                onChange={(e) => setMap({ ...colorMap, [key]: e.target.value })}
                className="h-8 w-full cursor-pointer rounded-md border border-slate-300 p-0.5"
              />
              <IconButton
                icon={<Trash2 size={14} />}
                label="Remove colour"
                tone="danger"
                onClick={() => {
                  const next = { ...colorMap }
                  delete next[key]
                  setMap(next)
                }}
              />
            </div>
          ))}
          {!Object.keys(colorMap).length && (
            <p className="text-[12px] text-slate-400">
              {isKpi ? 'Using the default accent' : 'Using the default palette'}
            </p>
          )}
        </div>
        {isKpi && (
          <BadgeNotice>The colour set for the value field tints the badge&apos;s accent bar.</BadgeNotice>
        )}
      </Group>

      <Group title="Display">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['dualAxis', 'Dual axis'],
              ['stacked', 'Stacked'],
              ['gradient', 'Gradient'],
              ['showLabels', 'Data labels'],
            ] as const
          ).map(([key, label]) => (
            <Toggle
              key={key}
              label={label}
              checked={Boolean((draft.options ?? {})[key])}
              onChange={(v) => setOption(key, v || undefined)}
            />
          ))}
        </div>
        {isKpi && <BadgeNotice>These shape a plotted chart; a badge has no axes to apply them to.</BadgeNotice>}
      </Group>
    </>
  )
}

export function PropertiesSection({ kind, draft, setCard }: Ctx) {
  return (
    <>
      <Group title="General">
        <div className="grid grid-cols-4 gap-3">
          <Field label="Title" className="col-span-4">
            <input
              className={inputCls}
              value={draft.title ?? ''}
              onChange={(e) => setCard({ title: e.target.value })}
            />
          </Field>
          <Field label="Subtitle" className="col-span-4">
            <input
              className={inputCls}
              value={draft.description ?? ''}
              onChange={(e) => setCard({ description: e.target.value })}
            />
          </Field>
          <Field label="Width">
            <Choice
              value={String(draft.layout?.span ?? (kind === 'kpi' ? 3 : 6))}
              onChange={(v) => setCard({ layout: { ...(draft.layout ?? {}), span: Number(v) } })}
              label="Width"
              options={asOptions([2, 3, 4, 6, 8, 9, 12], (n) => (n === '12' ? 'Full' : `${n}/12`))}
            />
          </Field>
        </div>
      </Group>

      <Group title="Number format">
        <div className="grid grid-cols-4 gap-3">
          <Field label="Style">
            <Choice
              value={draft.format?.type ?? ''}
              onChange={(v) => setCard({ format: { ...(draft.format ?? {}), type: v || undefined } })}
              label="Number style"
              options={FORMAT_STYLES}
            />
          </Field>
          <Field label="Prefix">
            <input
              className={inputCls}
              value={draft.format?.prefix ?? ''}
              onChange={(e) => setCard({ format: { ...(draft.format ?? {}), prefix: e.target.value } })}
            />
          </Field>
          <Field label="Suffix">
            <input
              className={inputCls}
              value={draft.format?.suffix ?? ''}
              onChange={(e) => setCard({ format: { ...(draft.format ?? {}), suffix: e.target.value } })}
            />
          </Field>
          <Field label="Decimals">
            <Choice
              value={String(draft.format?.digits ?? 0)}
              onChange={(v) => setCard({ format: { ...(draft.format ?? {}), digits: Number(v) } })}
              label="Decimals"
              options={asOptions([0, 1, 2, 3, 4])}
            />
          </Field>
        </div>
        {draft.columns?.some((c) => c.format && Object.keys(c.format).length > 0) && (
          <Notice>A field on this card carries its own format, which wins over this one.</Notice>
        )}
      </Group>

      {kind === 'kpi' && (
        <Group title="Comparison">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Label" className="col-span-2">
              <input
                className={inputCls}
                placeholder="vs last month"
                value={draft.comparison?.label ?? ''}
                onChange={(e) => setCard({ comparison: { ...(draft.comparison ?? {}), label: e.target.value } })}
              />
            </Field>
            <Field label="Delta unit">
              <input
                className={inputCls}
                value={draft.comparison?.deltaFormat?.suffix ?? '%'}
                onChange={(e) =>
                  setCard({
                    comparison: {
                      ...(draft.comparison ?? {}),
                      deltaFormat: { ...(draft.comparison?.deltaFormat ?? {}), suffix: e.target.value },
                    },
                  })
                }
              />
            </Field>
          </div>
        </Group>
      )}
    </>
  )
}
