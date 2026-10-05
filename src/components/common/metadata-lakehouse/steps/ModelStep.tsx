import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import type { Edge, Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Check, Loader2, RefreshCw, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { StepFrame } from '@/components/common/metadata-lakehouse/StepFrame'
import {
  EmptyState,
  NoConnectionState,
  QueryBoundary,
} from '@/components/common/metadata-lakehouse/DataStates'
import { AiBadge, ConfidenceMeter, StatusBadge } from '@/components/common/metadata-lakehouse/primitives'
import { formatRelativeTime, formatText } from '@/lib/format'
import { endpoints } from '@/api/endpoints'
import { useDecideRelationship, useModel } from '@/hooks/useMetadataLakehouse'
import { useWorkflow } from '@/context/workflowContext'
import type { ModelEdge, ModelGraph } from '@/types/metadataLakehouse'
import { TableNode } from '@/components/common/metadata-lakehouse/steps/TableNode'
import { autoLayout, cardinalityEnds, columnHandle } from '@/lib/graphLayout'

const RULE_LABELS: Record<string, string> = {
  declared: 'Declared foreign key',
  primary_key: 'Matches a primary key',
  same_name: 'Same column name',
}

const nodeTypes = { table: TableNode }

export function ModelStep() {
  const { connectionId, goToStep } = useWorkflow()
  const model = useModel(connectionId)

  if (!connectionId) {
    return (
      <StepFrame title="Model relationships" hideNext>
        <NoConnectionState onConnect={() => goToStep('connect')} />
      </StepFrame>
    )
  }

  const nodeCount = model.data?.nodes.length ?? 0
  const edgeCount = model.data?.edges.length ?? 0

  return (
    <StepFrame
      title="Model relationships"
      description="The tables the extraction recorded, and the relationships it found between them."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => model.refetch()}
          disabled={model.isFetching}
        >
          <RefreshCw
            className={cn('size-4', model.isFetching && 'animate-spin')}
            aria-hidden
          />
          Refresh
        </Button>
      }
      footerNote={
        model.data?.generatedAt
          ? `${nodeCount} table${nodeCount === 1 ? '' : 's'} · ${edgeCount} relationship${
              edgeCount === 1 ? '' : 's'
            } · from the run of ${formatRelativeTime(model.data.generatedAt)}`
          : undefined
      }
      refreshing={model.isFetching && !model.isPending}
    >
      <QueryBoundary
        query={model}
        step="Model"
        endpoint={`GET ${endpoints.context.model(connectionId)}`}
        context="load the data model"
        loading={<ModelSkeleton />}
      >
        {(data) => (
          <ReactFlowProvider>
            <ModelCanvas
              graph={data}
              connectionId={connectionId}
              onGoToUnderstand={() => goToStep('understand')}
            />
          </ReactFlowProvider>
        )}
      </QueryBoundary>
    </StepFrame>
  )
}

function ModelCanvas({
  graph,
  connectionId,
  onGoToUnderstand,
}: {
  graph: ModelGraph
  connectionId: string
  onGoToUnderstand: () => void
}) {
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const { readOnly } = useWorkflow()

  const decideRelationship = useDecideRelationship(connectionId)

  const drawn = useMemo(() => graph.edges.filter((edge) => edge.status !== 'rejected'), [graph.edges])

  const linkedByNode = useMemo(() => {
    const map = new Map<string, Set<string>>()
    const add = (id: string, col: string) => {
      if (!col) return
      if (!map.has(id)) map.set(id, new Set())
      map.get(id)!.add(col)
    }
    for (const edge of drawn) {
      add(edge.source, edge.sourceColumn)
      add(edge.target, edge.targetColumn)
    }
    return map
  }, [drawn])

  const initialNodes = useMemo<Node[]>(() => {
    const positions = new Map(autoLayout(graph.nodes, graph.edges).map((p) => [p.id, p.position]))
    return graph.nodes.map((node) => ({
      id: node.id,
      type: 'table',
      position: positions.get(node.id) ?? { x: 0, y: 0 },
      data: {
        node,
        highlighted: false,
        linked: [...(linkedByNode.get(node.id) ?? [])].filter((c) => node.columns.some((col) => col.name === c)),
        activeColumns: [],
      },
    }))
  }, [graph.nodes, graph.edges, linkedByNode])

  const initialEdges = useMemo<Edge[]>(() => {
    const hasColumn = (nodeId: string, col: string) =>
      graph.nodes.find((n) => n.id === nodeId)?.columns.some((c) => c.name === col) ?? false
    return drawn.map((edge) => {
      const [fromEnd, toEnd] = cardinalityEnds(edge.relationshipType)
      const weak = edge.status === 'inferred' && edge.rule === 'same_name'
      const dashed = edge.status === 'suggested' || (edge.status === 'inferred' && edge.rule === 'primary_key')
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: hasColumn(edge.source, edge.sourceColumn)
          ? columnHandle(edge.sourceColumn, 'source')
          : 'table:source',
        targetHandle: hasColumn(edge.target, edge.targetColumn)
          ? columnHandle(edge.targetColumn, 'target')
          : 'table:target',
        type: 'smoothstep',
        label: fromEnd || toEnd ? `${fromEnd || '?'} ─ ${toEnd || '?'}` : undefined,
        animated: edge.status === 'suggested',
        style: {
          strokeWidth: weak ? 1 : 1.75,
          strokeDasharray: weak ? '2 3' : dashed ? '5 3' : undefined,
          opacity: weak ? 0.7 : 1,
        },
        labelStyle: { fontSize: 11, fontWeight: 600 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
        data: { edge },
      }
    })
  }, [drawn, graph.nodes])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => setNodes(initialNodes), [initialNodes, setNodes])
  useEffect(() => setEdges(initialEdges), [initialEdges, setEdges])

  const selectedEdge = useMemo(
    () => graph.edges.find((e) => e.id === selectedEdgeId) ?? null,
    [graph.edges, selectedEdgeId]
  )

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        data: {
          ...(node.data as { node: unknown }),
          highlighted:
            Boolean(selectedEdge) &&
            (node.id === selectedEdge!.source || node.id === selectedEdge!.target),
          activeColumns: !selectedEdge
            ? []
            : node.id === selectedEdge.source
              ? [selectedEdge.sourceColumn]
              : node.id === selectedEdge.target
                ? [selectedEdge.targetColumn]
                : [],
        },
      })) as Node[]
    )
  }, [selectedEdge, setNodes])

  const onEdgeClick = useCallback((_: unknown, edge: Edge) => setSelectedEdgeId(edge.id), [])

  const decide = async (edge: ModelEdge, status: 'accepted' | 'rejected') => {
    try {
      await decideRelationship.mutateAsync({ id: edge.id, status })
      notify.success(status === 'accepted' ? 'Relationship accepted.' : 'Relationship rejected.')
      if (status === 'rejected') setSelectedEdgeId(null)
    } catch (err) {
      notify.failure(`${status === 'accepted' ? 'accept' : 'reject'} the relationship`, err)
    }
  }

  if (graph.nodes.length === 0) {
    return (
      <EmptyState
        title="No model yet"
        detail="The model is built from what the extraction recorded. Run it in Understand, and any tables and relationships it finds will appear here."
        action={
          <Button size="sm" onClick={onGoToUnderstand}>
            <Sparkles className="size-4" aria-hidden />
            Go to Understand
          </Button>
        }
      />
    )
  }

  const noRelationships = drawn.length === 0
  const inferredCount = drawn.filter((e) => e.status === 'inferred').length

  return (
    <div className="space-y-3">
      {noRelationships ? (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          The extraction recorded {graph.nodes.length} table
          {graph.nodes.length === 1 ? '' : 's'} but no relationships between them, and no key or
          column name links them either. That is a real answer for datasets that genuinely share
          no join — not a failure to look.
        </p>
      ) : inferredCount > 0 ? (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          {inferredCount} of these line{inferredCount === 1 ? ' is' : 's are'} detected from the
          schema — a declared key, a primary-key name match or a shared column name — not recorded
          by the extraction. Select one to see which rule found it.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="h-[560px] overflow-hidden rounded-lg border bg-muted/20">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeClick={onEdgeClick}
          onPaneClick={() => setSelectedEdgeId(null)}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          minZoom={0.1}
          maxZoom={1.75}
          proOptions={{ hideAttribution: false }}
        >
          <Background gap={16} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable className="!bg-background" />
        </ReactFlow>
      </div>

      <aside className="min-w-0">
        {selectedEdge ? (
          <RelationshipDetail
            edge={selectedEdge}
            busy={decideRelationship.isPending}
            pending={decideRelationship.isPending ? decideRelationship.variables?.status ?? null : null}
            onAccept={() => decide(selectedEdge, 'accepted')}
            onReject={() => decide(selectedEdge, 'rejected')}
            onClose={() => setSelectedEdgeId(null)}
            readOnly={readOnly}
          />
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Relationship details</p>
            <p className="mt-1">
              Select a relationship on the canvas to see its join condition, confidence and the
              reasoning behind it.
            </p>
            <ul className="mt-3 space-y-1 text-xs">
              <li className="flex items-center gap-2">
                <span className="w-8 border-t-2 border-foreground/70" aria-hidden /> Recorded / declared
              </li>
              <li className="flex items-center gap-2">
                <span className="w-8 border-t-2 border-dashed border-foreground/70" aria-hidden /> Suggested / key match
              </li>
              <li className="flex items-center gap-2">
                <span className="w-8 border-t-2 border-dotted border-foreground/50" aria-hidden /> Same column name
              </li>
            </ul>
            <dl className="mt-4 space-y-1.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt>Tables</dt>
                <dd className="tabular-nums text-foreground">{graph.nodes.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Relationships</dt>
                <dd className="tabular-nums text-foreground">{drawn.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Awaiting review</dt>
                <dd className="tabular-nums text-foreground">
                  {graph.edges.filter((e) => e.status === 'suggested').length}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </aside>
    </div>
    </div>
  )
}

function RelationshipDetail({
  edge,
  busy,
  pending,
  onAccept,
  onReject,
  onClose,
  readOnly = false,
}: {
  edge: ModelEdge
  busy: boolean
  pending: 'accepted' | 'rejected' | null
  onAccept: () => void
  onReject: () => void
  onClose: () => void
  readOnly?: boolean
}) {
  return (
    <div className="rounded-lg border bg-card">
      <header className="flex items-center gap-2 border-b px-3.5 py-2.5">
        <p className="min-w-0 flex-1 truncate text-sm font-medium">Relationship details</p>
        <Button variant="ghost" size="icon" className="size-6" onClick={onClose}>
          <X className="size-3.5" aria-hidden />
          <span className="sr-only">Close</span>
        </Button>
      </header>

      <div className="space-y-3 px-3.5 py-3 text-sm">
        <p className="font-mono text-xs">
          {edge.source} <span className="text-muted-foreground">→</span> {edge.target}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={edge.status === 'inferred' ? 'detected' : edge.status} />
          {edge.status === 'suggested' ? <AiBadge /> : null}
          {edge.status === 'inferred' && edge.rule ? (
            <span className="text-xs text-muted-foreground">{RULE_LABELS[edge.rule] ?? edge.rule}</span>
          ) : null}
        </div>

        <dl className="space-y-2">
          <div>
            <dt className="text-xs text-muted-foreground">Type</dt>
            <dd className="capitalize">{formatText(edge.relationshipType)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Join condition</dt>
            <dd>
              <code className="mt-0.5 block overflow-x-auto rounded bg-muted px-2 py-1 font-mono text-xs">
                {edge.joinCondition ??
                  `${edge.source}.${edge.sourceColumn} = ${edge.target}.${edge.targetColumn}`}
              </code>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Confidence</dt>
            <dd className="mt-1">
              <ConfidenceMeter value={edge.confidence} />
            </dd>
          </div>
        </dl>

        {edge.suggestion ? (
          <div className="rounded-md border-l-2 border-l-violet-400 bg-violet-50/50 px-3 py-2 dark:bg-violet-950/20">
            <p className="text-xs font-medium text-violet-700 dark:text-violet-300">
              Why this was suggested
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{edge.suggestion}</p>
          </div>
        ) : null}
      </div>

      {readOnly || edge.status === 'inferred' ? null : <footer className="flex flex-wrap items-center gap-2 border-t px-3.5 py-2.5">
        {edge.status === 'suggested' ? (
          <>
            <Button size="sm" onClick={onAccept} disabled={busy}>
              {pending === 'accepted' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Check className="size-4" aria-hidden />
              )}
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={onReject} disabled={busy}>
              {pending === 'rejected' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <X className="size-4" aria-hidden />
              )}
              Reject
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={onReject} disabled={busy}>
            {pending === 'rejected' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <X className="size-4" aria-hidden />
            )}
            Reject instead
          </Button>
        )}
      </footer>}
    </div>
  )
}

function ModelSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]" aria-busy="true">
      <span className="sr-only">Loading the data model…</span>
      <div className="relative h-[520px] overflow-hidden rounded-xl border bg-card">
        <Skeleton className="absolute left-[10%] top-[18%] h-28 w-48 rounded-lg" />
        <Skeleton className="absolute right-[12%] top-[30%] h-32 w-52 rounded-lg" />
        <Skeleton className="absolute bottom-[14%] left-[32%] h-28 w-48 rounded-lg" />
      </div>
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  )
}
