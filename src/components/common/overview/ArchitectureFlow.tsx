import { useEffect, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import {
  BarChart3,
  Bot,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Database,
  MessageSquare,
  Pause,
  Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import lakehouseImage from '@/assets/images/metadata-lakehouse-blue.png'
import { Hint } from '@/components/common/Hint'

const VIEW_W = 1000
const VIEW_H = 560

type NodeId = 'data' | 'ai' | 'lake' | 'chat' | 'agents' | 'bi'
type PathId =
  | 'data-ai'
  | 'ai-lake'
  | 'lake-ai'
  | 'ai-chat'
  | 'ai-agents'
  | 'ai-bi'
  | 'lake-chat'
  | 'lake-agents'
  | 'lake-bi'

interface NodeMeta {
  label: string
  sub: string
  icon?: ComponentType<{ className?: string }>
  x: number
  y: number
  w: number
  h: number
}

const NODES: Record<NodeId, NodeMeta> = {
  data: { label: 'Data', sub: 'Warehouses, BI tools & files', icon: Database, x: 40, y: 90, w: 110, h: 400 },
  ai: { label: 'AI', sub: 'Understands, profiles and connects every source', icon: BrainCircuit, x: 200, y: 50, w: 760, h: 110 },
  lake: { label: 'Metadata lakehouse', sub: 'Reviewed, versioned context', x: 200, y: 230, w: 170, h: 260 },
  chat: { label: 'Chat on Data', sub: 'Ask in plain English', icon: MessageSquare, x: 440, y: 330, w: 150, h: 130 },
  agents: { label: 'AI Agents', sub: 'Automate workflows', icon: Bot, x: 620, y: 330, w: 150, h: 130 },
  bi: { label: 'BI', sub: 'Live dashboards', icon: BarChart3, x: 800, y: 330, w: 150, h: 130 },
}

const PATHS: Record<PathId, { d: string; context?: boolean }> = {
  'data-ai': { d: 'M150,290 L175,290 L175,105 L200,105' },
  'ai-lake': { d: 'M285,160 L285,230' },
  'lake-ai': { d: 'M370,270 L420,270 L420,160', context: true },
  'ai-chat': { d: 'M695,160 L695,290 L515,290 L515,330' },
  'ai-agents': { d: 'M695,160 L695,330' },
  'ai-bi': { d: 'M695,160 L695,290 L875,290 L875,330' },
  'lake-chat': { d: 'M370,395 L440,395', context: true },
  'lake-agents': { d: 'M285,490 L285,522 L695,522 L695,460', context: true },
  'lake-bi': { d: 'M255,490 L255,542 L875,542 L875,460', context: true },
}

interface Step {
  title: string
  caption: string
  nodes: NodeId[]
  paths: PathId[]
}

const ALL_NODES = Object.keys(NODES) as NodeId[]
const ALL_PATHS = Object.keys(PATHS) as PathId[]

const STEPS: Step[] = [
  {
    title: 'It starts with your data',
    caption:
      'Connect a warehouse such as Domo. ELZE reads schemas, row counts, lineage and usage — your data never has to move.',
    nodes: ['data'],
    paths: [],
  },
  {
    title: 'AI reads and understands it',
    caption:
      'The extraction agent profiles every table and column, traces the dataflows between them and drafts business descriptions.',
    nodes: ['data', 'ai'],
    paths: ['data-ai'],
  },
  {
    title: 'Understanding becomes context',
    caption:
      'What the AI learns is written to the Metadata Lakehouse as facts your team reviews, edits and publishes as versions.',
    nodes: ['ai', 'lake'],
    paths: ['ai-lake'],
  },
  {
    title: 'Context grounds the AI',
    caption:
      'The AI reasons from approved context instead of guessing — so every answer uses your definitions, metrics and joins.',
    nodes: ['lake', 'ai'],
    paths: ['lake-ai'],
  },
  {
    title: 'One understanding, every channel',
    caption:
      'The same understanding powers chat on your data, automated AI agents and live BI dashboards.',
    nodes: ['ai', 'chat', 'agents', 'bi'],
    paths: ['ai-chat', 'ai-agents', 'ai-bi'],
  },
  {
    title: 'Trusted context, straight to the source',
    caption:
      'Chat, agents and BI read published context directly from the lakehouse — the approved version, not a copy.',
    nodes: ['lake', 'chat', 'agents', 'bi'],
    paths: ['lake-chat', 'lake-agents', 'lake-bi'],
  },
  {
    title: 'The whole picture',
    caption:
      'Connect once. Understand automatically. Govern with people in the loop. Use it everywhere.',
    nodes: ALL_NODES,
    paths: ALL_PATHS,
  },
]

const STEP_MS = 4800

function pct(n: number, total: number) {
  return `${(n / total) * 100}%`
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function ArchitectureFlow({ bare = false }: { bare?: boolean } = {}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(() => !prefersReducedMotion())
  const step = STEPS[stepIndex]

  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => setStepIndex((i) => (i + 1) % STEPS.length), STEP_MS)
    return () => clearInterval(timer)
  }, [playing])

  const goTo = (i: number) => {
    setPlaying(false)
    setStepIndex(((i % STEPS.length) + STEPS.length) % STEPS.length)
  }

  const nodeActive = (id: NodeId) => step.nodes.includes(id)
  const pathActive = (id: PathId) => step.paths.includes(id)

  return (
    <div className="af-root">
      <style>{STYLES}</style>

      <div className="-mx-2 overflow-x-auto px-2 pb-2">
        <div className="af-stage min-w-[720px]" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}>
          <div className="af-floor" aria-hidden />

          <svg
            className="af-svg"
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <marker id="af-arrow-idle" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="af-arrow-idle" />
              </marker>
              <marker id="af-arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="af-arrow-active" />
              </marker>
            </defs>

            {ALL_PATHS.map((id) => {
              const { d, context } = PATHS[id]
              const active = pathActive(id)
              return (
                <path
                  key={id}
                  d={d}
                  className={cn('af-path', context && 'af-path-context', active && 'active')}
                  markerEnd={`url(#${active ? 'af-arrow-active' : 'af-arrow-idle'})`}
                />
              )
            })}

            {step.paths.map((id) =>
              [0, 1].map((n) => (
                <circle
                  key={`${stepIndex}-${id}-${n}`}
                  r={PATHS[id].context ? 3.5 : 5}
                  className={cn('af-packet', PATHS[id].context && 'af-packet-context')}
                >
                  <animateMotion
                    dur={PATHS[id].context ? '2.4s' : '1.8s'}
                    begin={`${n * (PATHS[id].context ? 1.2 : 0.9)}s`}
                    repeatCount="indefinite"
                    path={PATHS[id].d}
                  />
                </circle>
              ))
            )}
          </svg>

          {ALL_NODES.map((id) => (
            <FlowNode key={id} id={id} meta={NODES[id]} active={nodeActive(id)} />
          ))}
        </div>
      </div>

      {bare ? null : (
        <>
      <div className="mt-4 flex flex-col gap-4 rounded-xl border bg-card/80 p-4 shadow-xs backdrop-blur sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
          <h3 className="mt-0.5 text-base font-semibold tracking-tight">{step.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{step.caption}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-1" role="tablist" aria-label="Architecture steps">
            {STEPS.map((s, i) => (
              <Hint key={s.title} label={s.title}><button
                type="button"
                role="tab"
                aria-selected={i === stepIndex}
                aria-label={`Step ${i + 1}: ${s.title}`}
                onClick={() => goTo(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === stepIndex ? 'w-7 bg-primary' : 'w-3 bg-muted-foreground/25 hover:bg-muted-foreground/45'
                )}
              /></Hint>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <IconButton label="Previous step" onClick={() => goTo(stepIndex - 1)}>
              <ChevronLeft className="size-4" />
            </IconButton>
            <IconButton label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)} primary>
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </IconButton>
            <IconButton label="Next step" onClick={() => goTo(stepIndex + 1)}>
              <ChevronRight className="size-4" />
            </IconButton>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-6 rounded bg-primary" aria-hidden /> Data & understanding flow
        </span>
        <span className="flex items-center gap-2">
          <span className="af-legend-dots w-6" aria-hidden /> Context from the lakehouse
        </span>
      </div>
        </>
      )}
    </div>
  )
}

function FlowNode({ id, meta, active }: { id: NodeId; meta: NodeMeta; active: boolean }) {
  const Icon = meta.icon
  const style = {
    left: pct(meta.x, VIEW_W),
    top: pct(meta.y, VIEW_H),
    width: pct(meta.w, VIEW_W),
    height: pct(meta.h, VIEW_H),
  }

  if (id === 'data') {
    return (
      <div className={cn('af-node af-cylinder', active && 'active')} style={style}>
        <span className="af-cylinder-top" aria-hidden />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 text-center">
          {Icon ? <Icon className="af-icon size-5" /> : null}
          <span className="text-sm font-semibold">{meta.label}</span>
          <span className="hidden text-[11px] leading-snug text-muted-foreground lg:block">{meta.sub}</span>
        </div>
      </div>
    )
  }

  if (id === 'ai') {
    return (
      <div className={cn('af-node af-bar', active && 'active')} style={style}>
        <span className="af-shimmer" aria-hidden />
        <div className="relative flex h-full items-center justify-center gap-3 px-6">
          {Icon ? (
            <span className="af-icon-wrap">
              <Icon className="size-5" />
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight">{meta.label}</p>
            <p className="hidden truncate text-xs text-muted-foreground md:block">{meta.sub}</p>
          </div>
        </div>
      </div>
    )
  }

  if (id === 'lake') {
    return (
      <div className={cn('af-node af-lake', active && 'active')} style={style}>
        <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
          <img src={lakehouseImage} alt="" draggable={false} className="af-lake-img" />
          <span className="text-sm font-semibold leading-tight">{meta.label}</span>
          <span className="hidden text-[11px] leading-snug text-muted-foreground lg:block">{meta.sub}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('af-node', active && 'active')} style={style}>
      <div className="flex h-full flex-col items-center justify-center gap-2 p-2 text-center">
        {Icon ? (
          <span className="af-icon-wrap">
            <Icon className="size-4.5" />
          </span>
        ) : null}
        <span className="text-sm font-semibold leading-tight">{meta.label}</span>
        <span className="hidden text-[11px] leading-snug text-muted-foreground lg:block">{meta.sub}</span>
      </div>
    </div>
  )
}

function IconButton({
  label,
  onClick,
  primary = false,
  children,
}: {
  label: string
  onClick: () => void
  primary?: boolean
  children: ReactNode
}) {
  return (
    <Hint label={label}><button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex size-8 items-center justify-center rounded-lg border transition-colors',
        primary
          ? 'border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90'
          : 'bg-background hover:bg-accent'
      )}
    >
      {children}
    </button></Hint>
  )
}

const STYLES = `
.af-stage {
  position: relative;
  width: 100%;
}

.af-floor {
  position: absolute;
  inset: 40% -8% -25%;
  background-image:
    linear-gradient(color-mix(in oklch, var(--primary) 14%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in oklch, var(--primary) 14%, transparent) 1px, transparent 1px);
  background-size: 44px 44px;
  transform: perspective(720px) rotateX(64deg);
  transform-origin: 50% 0;
  mask-image: radial-gradient(ellipse 60% 70% at 50% 10%, black 30%, transparent 75%);
  pointer-events: none;
}

.af-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.af-path {
  fill: none;
  stroke: var(--border);
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
  transition: stroke 0.4s ease, stroke-width 0.4s ease;
}
.af-path.active {
  stroke: var(--primary);
  stroke-width: 2.6;
  filter: drop-shadow(0 0 6px color-mix(in oklch, var(--primary) 55%, transparent));
}
.af-path-context {
  stroke-dasharray: 2 7;
}
.af-path-context.active {
  stroke-dasharray: 2 7;
  animation: af-march 1.2s linear infinite;
}
@keyframes af-march { to { stroke-dashoffset: -18; } }

.af-arrow-idle { fill: var(--border); }
.af-arrow-active { fill: var(--primary); }

.af-packet {
  fill: var(--primary);
  filter: drop-shadow(0 0 6px var(--primary));
}
.af-packet-context {
  fill: var(--card);
  stroke: var(--primary);
  stroke-width: 2;
}

.af-node {
  position: absolute;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--card-foreground);
  box-shadow:
    0 5px 0 -1px color-mix(in oklch, var(--border) 90%, transparent),
    0 18px 30px -18px color-mix(in oklch, var(--foreground) 30%, transparent);
  opacity: 0.55;
  transform: translateY(0);
  transition: opacity 0.45s ease, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.45s ease, border-color 0.45s ease;
  z-index: 2;
}
.af-node.active {
  opacity: 1;
  transform: translateY(-5px);
  border-color: color-mix(in oklch, var(--primary) 55%, transparent);
  box-shadow:
    0 6px 0 -1px color-mix(in oklch, var(--primary) 35%, transparent),
    0 0 0 4px color-mix(in oklch, var(--primary) 10%, transparent),
    0 24px 40px -18px color-mix(in oklch, var(--primary) 55%, transparent);
}

.af-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: color-mix(in oklch, var(--primary) 10%, transparent);
  color: var(--primary);
  flex-shrink: 0;
}
.af-icon { color: var(--primary); }

.af-cylinder {
  display: flex;
  flex-direction: column;
  border-radius: 50% / 9%;
  padding-top: 8%;
  background: linear-gradient(90deg, var(--card), color-mix(in oklch, var(--primary) 6%, var(--card)) 50%, var(--card));
}
.af-cylinder-top {
  position: absolute;
  top: 0;
  left: -1px;
  right: -1px;
  height: 18%;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: color-mix(in oklch, var(--primary) 8%, var(--card));
}
.af-cylinder.active .af-cylinder-top {
  border-color: color-mix(in oklch, var(--primary) 55%, transparent);
  background: color-mix(in oklch, var(--primary) 18%, var(--card));
}

.af-bar { overflow: hidden; }
.af-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 20%, color-mix(in oklch, var(--primary) 14%, transparent) 50%, transparent 80%);
  transform: translateX(-100%);
  opacity: 0;
}
.af-bar.active .af-shimmer {
  opacity: 1;
  animation: af-sweep 2.6s ease-in-out infinite;
}
@keyframes af-sweep { to { transform: translateX(100%); } }

.af-lake-img {
  width: 72%;
  max-width: 120px;
  height: auto;
  filter: grayscale(1) contrast(1.05) drop-shadow(0 10px 16px color-mix(in oklch, var(--primary) 18%, transparent));
}
.af-lake.active .af-lake-img { animation: af-float 3.2s ease-in-out infinite; }
@keyframes af-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }

.af-legend-dots {
  height: 2px;
  background-image: radial-gradient(circle, var(--primary) 1px, transparent 1.5px);
  background-size: 6px 2px;
}

@media (prefers-reduced-motion: reduce) {
  .af-packet { display: none; }
  .af-path-context.active,
  .af-bar.active .af-shimmer,
  .af-lake.active .af-lake-img { animation: none; }
  .af-node { transition: none; }
}
`
