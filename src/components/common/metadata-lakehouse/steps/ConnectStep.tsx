import { useState } from 'react'
import { StepFrame } from '@/components/common/metadata-lakehouse/StepFrame'
import { QueryBoundary, TableSkeleton } from '@/components/common/metadata-lakehouse/DataStates'
import { endpoints } from '@/api/endpoints'
import { notify } from '@/lib/notify'
import { accessAtLeast } from '@/lib/contextAccess'
import { useConnection, useConnectors, useVerifyConnection } from '@/hooks/useMetadataLakehouse'
import { useWorkflow } from '@/context/workflowContext'
import type { Connection, Connector } from '@/types/metadataLakehouse'
import { ConnectorGallery } from '@/components/common/metadata-lakehouse/steps/ConnectorGallery'
import { ConnectionForm } from '@/components/common/metadata-lakehouse/steps/ConnectionForm'
import { ConnectionOverview } from '@/components/common/metadata-lakehouse/steps/ConnectionOverview'

export function ConnectStep() {
  const { connectionId, setConnectionId, goToStep } = useWorkflow()
  if (connectionId) return <ConnectedSummary connectionId={connectionId} />
  return <ConnectForm connectionId={connectionId} setConnectionId={setConnectionId} goToStep={goToStep} />
}

function ConnectedSummary({ connectionId }: { connectionId: string }) {
  const { readOnly, access } = useWorkflow()
  const connection = useConnection(connectionId)
  const verify = useVerifyConnection()
  const canVerify = !readOnly && accessAtLeast(access, 'edit')

  const runVerify = async (c: Connection) => {
    try {
      await verify.mutateAsync(c.id)
      notify.success(`${c.name} is still connected.`)
    } catch (err) {
      notify.failure(`verify ${c.name}`, err)
    }
  }

  return (
    <StepFrame
      title="Connect a data source"
      description={
        readOnly
          ? 'The data source this context was built from.'
          : 'This context reads from the data source below. Continue to the next step, or verify it again if its credentials have changed.'
      }
    >
      <QueryBoundary
        query={connection}
        step="Connect"
        endpoint={`GET ${endpoints.context.connection(connectionId)}`}
        context="load the connection"
        loading={<TableSkeleton rows={2} columns={3} />}
      >
        {(c) => (
          <ConnectionOverview
            connection={c}
            canVerify={canVerify}
            verifying={verify.isPending}
            onVerify={() => void runVerify(c)}
          />
        )}
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
