import { useState } from 'react'
import { StepFrame } from '@/components/common/metadata-lakehouse/StepFrame'
import { QueryBoundary, TableSkeleton } from '@/components/common/metadata-lakehouse/DataStates'
import { endpoints } from '@/api/endpoints'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatRelativeTime, maskSecretHint } from '@/lib/format'
import { connectorPresentation } from '@/lib/connectors'
import { useConnection, useConnectors } from '@/hooks/useMetadataLakehouse'
import { useWorkflow } from '@/context/workflowContext'
import type { Connector } from '@/types/metadataLakehouse'
import { ConnectorGallery } from '@/components/common/metadata-lakehouse/steps/ConnectorGallery'
import { ConnectionForm } from '@/components/common/metadata-lakehouse/steps/ConnectionForm'

export function ConnectStep() {
  const { connectionId, setConnectionId, goToStep, readOnly } = useWorkflow()
  if (readOnly && connectionId) return <ConnectedSummary connectionId={connectionId} />
  return <ConnectForm connectionId={connectionId} setConnectionId={setConnectionId} goToStep={goToStep} />
}

function ConnectedSummary({ connectionId }: { connectionId: string }) {
  const connection = useConnection(connectionId)
  return (
    <StepFrame title="Connect a data source" description="The data source this context was built from.">
      <QueryBoundary
        query={connection}
        step="Connect"
        endpoint={`GET ${endpoints.context.connection(connectionId)}`}
        context="load the connection"
        loading={<TableSkeleton rows={2} columns={3} />}
      >
        {(c) => {
          const presentation = connectorPresentation(c.provider)
          const connected = c.status === 'connected'
          return (
            <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
              <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-md', presentation.accentClass)}>
                <presentation.icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{c.name}</span>
                  <Badge
                    variant="outline"
                    className={
                      connected
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
                    }
                  >
                    {connected ? 'Connected' : 'Not working'}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {c.provider} · {c.host} · {maskSecretHint(c.secretHint)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Connected {formatRelativeTime(c.createdAt)} · verified {formatRelativeTime(c.lastVerifiedAt)}
                </p>
              </div>
            </div>
          )
        }}
      </QueryBoundary>
    </StepFrame>
  )
}

function ConnectForm({
  connectionId,
  setConnectionId,
  goToStep,
}: {
  connectionId: string | null
  setConnectionId: (id: string | null) => void
  goToStep: (id: 'context') => void
}) {
  const [chosen, setChosen] = useState<Connector | null>(null)

  const connectors = useConnectors()

  return (
    <StepFrame
      title="Connect a data source"
      description="Choose a warehouse and provide credentials. We will validate them against the provider before anything is saved."
      nextDisabled={!connectionId}
      onNext={() => {
        if (!connectionId) return false
      }}
      footerNote={
        connectionId ? undefined : 'Connect or select a data source to continue.'
      }
    >
      <div className="space-y-8">

        <QueryBoundary
          query={connectors}
          step="Connect"
          endpoint={`GET ${endpoints.context.connectors()}`}
          context="load the connector catalogue"
          loading={<TableSkeleton rows={2} columns={3} />}
        >
          {(list) => (
            <ConnectorGallery
              connectors={list}
              selectedId={chosen?.id ?? null}
              onSelect={setChosen}
            />
          )}
        </QueryBoundary>

        {chosen ? (
          <ConnectionForm
            connector={chosen}
            onCancel={() => setChosen(null)}
            onConnected={(created) => {
              setChosen(null)
              setConnectionId(created.connection.id)
              goToStep('context')
            }}
          />
        ) : null}
      </div>
    </StepFrame>
  )
}
