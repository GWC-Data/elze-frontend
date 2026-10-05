import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronRight, Loader2, MessageCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notify'
import { StepFrame } from '@/components/common/metadata-lakehouse/StepFrame'
import {
  BusyOverlay,
  CardSkeleton,
  EmptyState,
  ErrorState,
  NoConnectionState,
  TileSkeleton,
} from '@/components/common/metadata-lakehouse/DataStates'
import {
  useConnection,
  useExtraction,
  useFactsByTable,
  useRunExtraction,
  useUnderstanding,
} from '@/hooks/useMetadataLakehouse'
import { useWorkflow } from '@/context/workflowContext'
import type { ExtractionResult } from '@/api/extraction.api'
import type { FactsByTable } from '@/api/contextObjects.api'
import type { Understanding } from '@/types/metadataLakehouse'
import { AgentReport } from '@/components/common/metadata-lakehouse/steps/AgentReport'
import { GlossaryView } from '@/components/common/metadata-lakehouse/steps/GlossaryView'
import { TableExplorer } from '@/components/common/metadata-lakehouse/steps/TableExplorer'
import { UnderstandChatWidget } from '@/components/common/metadata-lakehouse/steps/UnderstandChatWidget'

export function UnderstandStep() {
  const { connectionId, goToStep, readOnly } = useWorkflow()
  const [chatOpen, setChatOpen] = useState(false)
  const [chatTable, setChatTable] = useState<string | null>(null)
  const openChatForTable = (tableName: string) => {
    setChatTable(tableName)
    setChatOpen(true)
  }
  const connection = useConnection(connectionId)
  const extraction = useExtraction(connectionId)
  const facts = useFactsByTable(connectionId)
  const glossary = useUnderstanding(connectionId)
  const rerun = useRunExtraction(connectionId)

  if (!connectionId) {
    return (
      <StepFrame title="Understand your data" hideNext>
        <NoConnectionState onConnect={() => goToStep('connect')} />
      </StepFrame>
    )
  }

  const datasetIds = (connection.data?.selectedDatasets ?? []).map((d) => d.id)

  const run = async () => {
    try {
      await rerun.mutateAsync({ datasetIds })
      notify.success('Extraction finished.')
    } catch (err) {
      notify.failure('run the context extraction', err)
    }
  }

  const result = extraction.data ?? null
  const running = rerun.isPending
  const hasContent = Boolean(
    result || (facts.data && facts.data.count > 0) || (glossary.data && glossary.data.stats.termsGenerated > 0)
  )

  const body = extraction.isPending || (glossary.isPending && !result) ? (
    <UnderstandSkeleton />
  ) : extraction.isError ? (
    <ErrorState
      context="reach the context extraction service"
      error={extraction.error}
      onRetry={() => extraction.refetch()}
    />
  ) : hasContent ? (
    <ExtractionView
      connectionId={connectionId}
      result={result}
      facts={facts.data ?? null}
      glossary={glossary.data ?? null}
      glossaryLoading={glossary.isPending}
      onAskAboutTable={readOnly ? undefined : openChatForTable}
    />
  ) : (
    <EmptyState
      title="No extraction yet"
      detail={
        datasetIds.length === 0
          ? 'Select datasets in Discover first — the agent is given those ids to work from.'
          : 'Run the extraction to have the agent read the selected datasets and write what it finds into the Metadata Lakehouse.'
      }
      action={
        readOnly ? undefined : datasetIds.length > 0 ? (
          <Button size="sm" onClick={run}>
            <Sparkles className="size-4" aria-hidden />
            Run extraction
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => goToStep('discover')}>
            Go to Discover
          </Button>
        )
      }
    />
  )

  return (
    <>
      <StepFrame
        title="Understand your data"
        description={
          readOnly
            ? 'What the extraction agent found, as it was published. Nothing is re-run.'
            : 'What the extraction agent found in the datasets you selected.'
        }
        actions={
          readOnly ? undefined : <Button
            variant="outline"
            size="sm"
            onClick={run}
            disabled={running || datasetIds.length === 0}
          >
            {running ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
            {result ? 'Run again' : 'Run extraction'}
          </Button>
        }
        refreshing={!running && (glossary.isFetching || extraction.isFetching) && hasContent}
        headerExtra={
          readOnly ? undefined : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setChatTable(null)
                setChatOpen((v) => !v)
              }}
            >
              <MessageCircle className="size-4" aria-hidden />
              {chatOpen ? 'Close chat' : 'Ask about this data'}
            </Button>
          )
        }
      >
        {running ? (
          <div className="relative min-h-[480px]">
            {hasContent ? body : <UnderstandSkeleton />}
            <BusyOverlay
              title="Analysing your data with AI"
              detail={`Reading ${datasetIds.length} dataset${datasetIds.length === 1 ? '' : 's'} and generating the business glossary, metrics and relationships. This can take a few minutes.`}
            />
          </div>
        ) : (
          body
        )}
      </StepFrame>
      {!readOnly && (
        <UnderstandChatWidget
          // A re-run records a new extraction session: start the panel over on it.
          key={result?.sessionId || 'none'}
          connectionId={connectionId}
          extractionSessionId={result?.sessionId || null}
          open={chatOpen}
          onOpenChange={setChatOpen}
          focusTable={chatTable}
        />
      )}
    </>
  )
}

function UnderstandSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <TileSkeleton count={3} />
      <CardSkeleton rows={8} columns={6} />
    </div>
  )
}

function ExtractionView({
  connectionId,
  result,
  facts,
  glossary,
  glossaryLoading,
  onAskAboutTable,
}: {
  connectionId: string
  result: ExtractionResult | null
  facts: FactsByTable | null
  glossary: Understanding | null
  glossaryLoading: boolean
  onAskAboutTable?: (tableName: string) => void
}) {
  const terms = glossary?.stats.termsGenerated ?? 0
  return (
    <div className="space-y-6">
      {result?.interrupted ? (
        <p className="rounded-md border border-l-2 border-l-destructive bg-muted/40 p-3 text-sm">
          <span className="font-semibold">Interrupted. </span>
          <span className="text-muted-foreground">
            This run did not finish, so what follows may be incomplete.
          </span>
        </p>
      ) : null}

      {facts && facts.count > 0 ? (
        <TableExplorer connectionId={connectionId} onAskAboutTable={onAskAboutTable} />
      ) : null}

      {glossary && terms > 0 ? (
        <Collapsible
          title={`Business glossary (${terms} term${terms === 1 ? '' : 's'})`}
          description="Entities, metrics and terms the run defined, with their review state."
        >
          <GlossaryView connectionId={connectionId} />
        </Collapsible>
      ) : glossaryLoading ? (
        <UnderstandSkeleton />
      ) : null}

      {result && result.text.trim() ? (
        <AgentReport text={result.text} />
      ) : null}
    </div>
  )
}

function Collapsible({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
          aria-hidden
        />
        <span className="text-sm font-semibold">{title}</span>
        {description ? (
          <span className="truncate text-xs text-muted-foreground">{description}</span>
        ) : null}
      </summary>
      <div className="border-t px-4 py-4">{children}</div>
    </details>
  )
}
