import { Component, Suspense, lazy } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Database,
  MessageSquare,
  PlugZap,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/hooks/usePaths'
import { cn } from '@/lib/utils'
import { ArchitectureFlow } from '@/components/common/overview/ArchitectureFlow'

const ArchitectureScene = lazy(() => import('@/components/common/overview/ArchitectureScene'))

export default function ArchitecturePage() {
  const { can } = useAuth()
  const paths = usePaths()
  const canBuild = can('context.create')
  const canRead = can('context.read')

  return (
    <div className="min-h-full">
      <section
        aria-label="ELZE architecture"
        className="ov-stage relative h-dvh min-h-[520px] w-full overflow-hidden"
      >
        <style>{STAGE_STYLES}</style>
        <div aria-hidden className="ov-dots ov-dots-fine" />
        <div aria-hidden className="ov-dots ov-dots-coarse" />
        <div aria-hidden className="ov-vignette" />
        <SceneBoundary fallback={<SvgFallback />}>
          <Suspense fallback={<SceneLoading />}>
            <ArchitectureScene />
          </Suspense>
        </SceneBoundary>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-14 sm:px-6">
        <section>
          <SectionTitle
            eyebrow="From connection to answer"
            title="Four stages, people in the loop"
            description="The AI does the heavy lifting; your team decides what becomes truth."
          />
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StageCard
              n={1}
              icon={PlugZap}
              title="Connect"
              body="Link a warehouse such as Domo and choose the datasets that matter. Credentials are validated and encrypted."
              to={canRead ? paths.metadataLakehouse : undefined}
            />
            <StageCard
              n={2}
              icon={BrainCircuit}
              title="Understand"
              body="The extraction agent profiles tables and columns, traces lineage and drafts descriptions for every field."
              to={canBuild ? paths.metadataLakehouseBuilder() : undefined}
            />
            <StageCard
              n={3}
              icon={ShieldCheck}
              title="Review & publish"
              body="Your team edits and approves what the AI wrote, then publishes it as a named, versioned context."
              to={canRead ? paths.metadataLakehouse : undefined}
            />
            <StageCard
              n={4}
              icon={CheckCircle2}
              title="Use everywhere"
              body="Chat, agents and dashboards read the published context — the same definitions in every answer."
              to={paths.dataAnalyst()}
            />
          </ol>
        </section>

        <section>
          <SectionTitle
            eyebrow="What you can do"
            title="One source of truth, three ways to use it"
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <OutletCard
              icon={MessageSquare}
              title="Chat on Data"
              body="Ask questions in plain English and get answers, charts and tables grounded in your context."
              cta="Open the data analyst"
              to={paths.dataAnalyst()}
            />
            <OutletCard
              icon={Bot}
              title="AI Agents"
              body="Turn repeatable analyses into playbooks that run on a schedule and report back automatically."
              cta="Go to playbooks"
              to={paths.playbooks()}
            />
            <OutletCard
              icon={BarChart3}
              title="BI"
              body="Live dashboards built on the same definitions — shared with the right people, never out of step."
              cta="View dashboards"
              to={paths.dashboards}
            />
          </div>
        </section>

        <p className="flex items-center justify-center gap-2 pb-2 text-xs text-muted-foreground">
          <Database className="size-3.5" aria-hidden />
          Your data stays where it is — ELZE stores context about it, not copies of it.
        </p>
      </div>
    </div>
  )
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {description ? <p className="mt-3 text-pretty text-muted-foreground">{description}</p> : null}
    </div>
  )
}

function StageCard({
  n,
  icon: Icon,
  title,
  body,
  to,
}: {
  n: number
  icon: ComponentType<{ className?: string }>
  title: string
  body: string
  to?: string
}) {
  return (
    <li className="group relative flex flex-col rounded-2xl border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="flex size-10 items-center justify-center rounded-xl border bg-muted/60 text-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="text-3xl font-bold tabular-nums text-muted-foreground/25">0{n}</span>
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{body}</p>
      {to ? (
        <Link to={to} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
          Open <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      ) : null}
    </li>
  )
}

function OutletCard({
  icon: Icon,
  title,
  body,
  cta,
  to,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  body: string
  cta: string
  to: string
}): ReactNode {
  return (
    <Link
      to={to}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-6 shadow-xs transition-all',
        'hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md'
      )}
    >
      <span className="relative flex size-11 items-center justify-center rounded-xl border bg-muted/60 text-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="relative mt-5 text-lg font-semibold">{title}</h3>
      <p className="relative mt-2 flex-1 text-sm text-muted-foreground">{body}</p>
      <span className="relative mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
        {cta}
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  )
}

function SceneLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center" aria-busy="true">
      <div className="size-8 animate-spin rounded-full border-2 border-black/10 border-t-[#0b0b0b]" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

function SvgFallback() {
  return (
    <div className="mx-auto flex h-full max-w-5xl items-center px-4">
      <div className="w-full">
        <ArchitectureFlow bare />
      </div>
    </div>
  )
}

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

const STAGE_STYLES = `
.ov-stage {
  background:
    radial-gradient(ellipse 70% 55% at 50% 38%, #ffffff 0%, transparent 70%),
    linear-gradient(180deg, #fcfcfb 0%, #f9f9f7 55%, #f3f2ef 100%);
}
.ov-dots {
  position: absolute;
  inset: 0;
  pointer-events: none;
  mask-image: radial-gradient(ellipse 75% 70% at 50% 45%, black 35%, transparent 85%);
  -webkit-mask-image: radial-gradient(ellipse 75% 70% at 50% 45%, black 35%, transparent 85%);
  will-change: background-position;
}
.ov-dots-fine {
  background-image: radial-gradient(circle, rgba(11, 11, 11, 0.16) 1px, transparent 1.5px);
  background-size: 22px 22px;
  animation: ov-dots-fine 9s linear infinite;
}
.ov-dots-coarse {
  background-image: radial-gradient(circle, rgba(11, 11, 11, 0.08) 1.6px, transparent 2.2px);
  background-size: 54px 54px;
  animation: ov-dots-coarse 22s linear infinite;
}
@keyframes ov-dots-fine { to { background-position: 22px 22px; } }
@keyframes ov-dots-coarse { to { background-position: -54px 54px; } }
.ov-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 75% at 50% 45%, transparent 60%, rgba(11, 11, 11, 0.04) 100%);
  pointer-events: none;
}
.ov-stage canvas { position: relative; z-index: 1; }
@media (prefers-reduced-motion: reduce) {
  .ov-dots { animation: none; }
}
`
