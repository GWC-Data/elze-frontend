import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronRight, Sparkles } from 'lucide-react'
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
  useRefreshFacts,
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
import type { DatasetNames, MentionControls, MentionRow } from '@/components/common/metadata-lakehouse/steps/mentions'

export function UnderstandStep() {
  const { connectionId, goToStep, readOnly } = useWorkflow()
  const connection = useConnection(connectionId)
  const extraction = useExtraction(connectionId)
  const facts = useFactsByTable(connectionId)
  const glossary = useUnderstanding(connectionId)
  const rerun = useRunExtraction(connectionId)
  const refreshFacts = useRefreshFacts(connectionId)

  const [mentions, setMentions] = useState<MentionRow[]>([])
  const [rowsVersion, setRowsVersion] = useState<string | null>(null)
  const datasetNames = useMemo<DatasetNames>(
    () =>
      new Map(
        (connection.data?.selectedDatasets ?? []).map((d) => [String(d.id).toLowerCase(), d.name || String(d.id)])
      ),
    [connection.data]
  )

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

  const chatVersionId = !readOnly && facts.data && facts.data.count > 0 ? facts.data.resolvedVersionId : null
  if (chatVersionId !== rowsVersion) {
    setRowsVersion(chatVersionId)
    setMentions([])
  }

  const addMention = (row: MentionRow) =>
    setMentions((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]))

  const mention: MentionControls | undefined = chatVersionId
    ? {
        mentions,
        datasetNames,
        onToggle: (row) =>
          setMentions((prev) => (prev.some((m) => m.id === row.id) ? prev.filter((m) => m.id !== row.id) : [...prev, row])),
      }
    : undefined

  const chat =
    chatVersionId && mention ? (
      <UnderstandChatWidget
        key={chatVersionId}
        connectionId={connectionId}
        versionId={chatVersionId}
        mentions={mentions}
        onAddMention={addMention}
        onRemoveMention={(id) => setMentions((prev) => prev.filter((m) => m.id !== id))}
        datasetNames={datasetNames}
        onEdited={refreshFacts}
        className="h-[560px] xl:h-[calc(100dvh-3rem)] xl:max-h-[820px]"
      />
    ) : null

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
      mention={mention}
      chat={chat}
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
    <StepFrame
      title="Understand your data"
      description={
        readOnly
          ? 'What the extraction agent found, as it was published. Nothing is re-run.'
          : 'What the extraction agent found in the datasets you selected.'
      }
      refreshing={!running && (glossary.isFetching || extraction.isFetching) && hasContent}
      scrollBody={!chat}
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
  mention,
  chat,
}: {
  connectionId: string
  result: ExtractionResult | null
  facts: FactsByTable | null
  glossary: Understanding | null
  glossaryLoading: boolean
  mention?: MentionControls
  chat: ReactNode
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
        chat ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
            <div className="min-w-0">
              <TableExplorer connectionId={connectionId} mention={mention} narrow />
            </div>
            <aside className="min-w-0 xl:sticky xl:top-6">{chat}</aside>
          </div>
        ) : (
          <TableExplorer connectionId={connectionId} />
        )
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
