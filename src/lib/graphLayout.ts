import type { ModelEdge, ModelNode } from '@/types/metadataLakehouse'

const COLUMN_WIDTH = 320
const ROW_HEIGHT = 190
const ORIGIN = { x: 40, y: 40 }

export interface PositionedNode {
  id: string
  position: { x: number; y: number }
}

function assignDepths(nodes: ModelNode[], edges: ModelEdge[]): Map<string, number> {
  const ids = new Set(nodes.map((n) => n.id))
  const outgoing = new Map<string, string[]>()
  const indegree = new Map<string, number>(nodes.map((n) => [n.id, 0]))

  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, [])
    outgoing.get(edge.source)!.push(edge.target)
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1)
  }

  const depth = new Map<string, number>()
  const seen = new Set<string>()
  const roots = nodes.filter((n) => (indegree.get(n.id) ?? 0) === 0).map((n) => n.id)

  const queue = roots.length > 0 ? [...roots] : nodes.slice(0, 1).map((n) => n.id)
  for (const id of queue) {
    depth.set(id, 0)
    seen.add(id)
  }

  while (queue.length > 0) {
    const id = queue.shift()!
    const current = depth.get(id) ?? 0
    for (const next of outgoing.get(id) ?? []) {
      const candidate = current + 1
      if (!depth.has(next) || candidate > depth.get(next)!) depth.set(next, candidate)
      if (!seen.has(next)) {
        seen.add(next)
        queue.push(next)
      }
    }
  }

  const orphanDepth = Math.max(0, ...depth.values()) + 1
  for (const node of nodes) {
    if (!depth.has(node.id)) depth.set(node.id, orphanDepth)
  }

  return depth
}

export function autoLayout(nodes: ModelNode[], edges: ModelEdge[]): PositionedNode[] {
  const depths = assignDepths(nodes, edges)

  const byDepth = new Map<number, ModelNode[]>()
  for (const node of nodes) {
    const d = depths.get(node.id) ?? 0
    if (!byDepth.has(d)) byDepth.set(d, [])
    byDepth.get(d)!.push(node)
  }

  const tallest = Math.max(...[...byDepth.values()].map((c) => c.length), 1)

  const positioned: PositionedNode[] = []
  for (const [depth, column] of byDepth) {
    const offset = ((tallest - column.length) * ROW_HEIGHT) / 2
    column.forEach((node, row) => {
      positioned.push({
        id: node.id,
        position: node.position ?? {
          x: ORIGIN.x + depth * COLUMN_WIDTH,
          y: ORIGIN.y + offset + row * ROW_HEIGHT,
        },
      })
    })
  }

  return positioned
}

export function columnHandle(column: string, side: 'source' | 'target'): string {
  return `col:${side}:${column}`
}

export function cardinalityEnds(type: string | null | undefined): [string, string] {
  const t = String(type || '').toLowerCase()
  const many = (part: string) => /many|\*|\bn\b|\bm\b/.test(part)
  const one = (part: string) => /\bone\b|\b1\b/.test(part)
  const parts = t.includes('-to-') ? t.split('-to-') : t.split(/[:→>]/)
  if (parts.length >= 2) {
    const end = (part: string) => (many(part) ? '*' : one(part) ? '1' : '')
    return [end(parts[0]), end(parts[parts.length - 1])]
  }
  return ['', '']
}
