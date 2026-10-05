import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { KeyRound, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ModelNode } from '@/types/metadataLakehouse'
import { columnHandle } from '@/lib/graphLayout'
import { Hint } from '@/components/common/Hint'

const MAX_VISIBLE_COLUMNS = 8

export type TableNodeData = {
  node: ModelNode
  highlighted: boolean
  linked: string[]
  activeColumns: string[]
}

const handleClass = '!size-2 !border-2 !border-primary/60 !bg-background'

function TableNodeImpl({ data, selected }: NodeProps) {
  const { node, highlighted, linked, activeColumns } = data as TableNodeData
  const linkedSet = new Set(linked)
  const activeSet = new Set(activeColumns)
  const ordered = [
    ...node.columns.filter((c) => linkedSet.has(c.name)),
    ...node.columns.filter((c) => !linkedSet.has(c.name)),
  ]
  const cap = Math.max(MAX_VISIBLE_COLUMNS, linked.length)
  const visible = ordered.slice(0, cap)
  const overflow = ordered.length - visible.length

  return (
    <div
      className={cn(
        'w-60 rounded-lg border bg-card shadow-sm transition-all',
        selected && 'ring-2 ring-primary',
        highlighted && !selected && 'ring-2 ring-primary/50',
        !selected && !highlighted && 'opacity-95'
      )}
    >
      <Handle type="target" position={Position.Left} id="table:target" className={handleClass} />
      <Handle type="source" position={Position.Right} id="table:source" className={handleClass} />

      <header
        className={cn(
          'flex items-center gap-1.5 rounded-t-lg border-b px-2.5 py-1.5',
          node.kind === 'fact' && 'bg-violet-50 dark:bg-violet-950/40',
          node.kind === 'dimension' && 'bg-sky-50 dark:bg-sky-950/40',
          node.kind !== 'fact' && node.kind !== 'dimension' && 'bg-muted/60'
        )}
      >
        <span
          className={cn(
            'size-1.5 shrink-0 rounded-full',
            node.kind === 'fact' && 'bg-violet-500',
            node.kind === 'dimension' && 'bg-sky-500',
            node.kind !== 'fact' && node.kind !== 'dimension' && 'bg-muted-foreground'
          )}
          aria-hidden
        />
        <Hint label={node.label}><p className="min-w-0 flex-1 truncate text-xs font-semibold">
          {node.label}
        </p></Hint>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{node.columns.length}</span>
      </header>

      <ul className="divide-y text-[11px]">
        {visible.map((column) => {
          const isLinked = linkedSet.has(column.name)
          return (
            <li
              key={column.name}
              className={cn(
                'relative flex items-center gap-1.5 px-2.5 py-1',
                isLinked && 'bg-primary/5',
                activeSet.has(column.name) && 'bg-primary/15 font-semibold'
              )}
            >
              {isLinked ? (
                <>
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={columnHandle(column.name, 'target')}
                    className={handleClass}
                  />
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={columnHandle(column.name, 'source')}
                    className={handleClass}
                  />
                </>
              ) : null}
              {column.isPrimaryKey ? (
                <KeyRound className="size-3 shrink-0 text-amber-600" aria-label="Primary key" />
              ) : isLinked ? (
                <Link2 className="size-3 shrink-0 text-primary" aria-label="Joined column" />
              ) : (
                <span className="size-3 shrink-0" aria-hidden />
              )}
              <Hint label={column.name}><span className="min-w-0 flex-1 truncate font-mono">
                {column.name}
              </span></Hint>
              {column.dataType ? (
                <span className="shrink-0 truncate text-[9px] uppercase text-muted-foreground">
                  {column.dataType}
                </span>
              ) : null}
              {column.isForeignKey ? (
                <span className="shrink-0 text-[9px] font-semibold text-sky-800 dark:text-sky-300">
                  FK
                </span>
              ) : null}
            </li>
          )
        })}
        {overflow > 0 ? (
          <li className="px-2.5 py-1 text-[11px] italic text-muted-foreground">+{overflow} more</li>
        ) : null}
        {node.columns.length === 0 ? (
          <li className="px-2.5 py-1 text-[11px] italic text-muted-foreground">No columns reported</li>
        ) : null}
      </ul>
    </div>
  )
}

export const TableNode = memo(TableNodeImpl)
