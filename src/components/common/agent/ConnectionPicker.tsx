import { useEffect, useRef } from "react"
import { Database } from "lucide-react"

import { useConnections } from "@/hooks/useMetadataLakehouse"
import { ContextQueryProvider } from "@/context/QueryProvider"
import { connectorPresentation } from "@/lib/connectors"
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/workbench/badge"
import { EmptyState, ErrorState, InlineLoading } from "@/components/common/States"
import type { Connection } from "@/types/metadataLakehouse"

// A required full-page gate for any ADK-backed feature: workspace_id there is a
// specific connection's id, so a chat/playbooks page has nothing to talk to
// until one is chosen. Switching connections mid-conversation would be
// meaningless once a session is bound to the old one, so this is a fresh
// navigation (onSelect), not a header dropdown that could swap silently.
//
// Wraps itself in ContextQueryProvider: useConnections() is a react-query hook,
// and the app only sets up a QueryClient inside the metadata-lakehouse module's
// own subtree — this component is used from agent pages outside that subtree.
export function ConnectionPicker(props: { onSelect: (connectionId: string) => void }) {
  return (
    <ContextQueryProvider>
      <ConnectionPickerBody {...props} />
    </ContextQueryProvider>
  )
}

function ConnectionPickerBody({ onSelect }: { onSelect: (connectionId: string) => void }) {
  const connections = useConnections()
  const list = connections.data ?? []
  const onlyConnectionId = list.length === 1 && list[0].status === 'connected' ? list[0].id : null

  // Skip the gate when it isn't actually a choice: exactly one working
  // connection means there's nothing to pick between.
  const autoSelectedRef = useRef(false)
  useEffect(() => {
    if (autoSelectedRef.current || !onlyConnectionId) return
    autoSelectedRef.current = true
    onSelect(onlyConnectionId)
  }, [onlyConnectionId, onSelect])

  // Until we know whether there is a choice to make - still loading, or about to skip straight
  // through with the only connection - show a neutral loader, not the "Choose a connection"
  // heading: otherwise that heading flashes for a moment before the chat or playbooks appear.
  if (connections.isPending || onlyConnectionId) {
    return (
      <div className="flex h-full min-h-[40vh] items-center justify-center p-6">
        <InlineLoading label="Loading…" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-base font-semibold text-foreground">Choose a connection</h1>
        <p className="text-sm text-muted-foreground">
          Pick which data connection this chat should work against.
        </p>
      </div>

      {connections.isError ? (
        <ErrorState error={connections.error} title="Unable to load connections" onRetry={connections.refetch} />
      ) : list.length === 0 ? (
        <EmptyState
          title="No connections yet"
          body="Connect a data source in the Metadata Lakehouse first."
          icon={Database}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((connection) => (
            <ConnectionRow key={connection.id} connection={connection} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ConnectionRow({
  connection,
  onSelect,
}: {
  connection: Connection
  onSelect: (connectionId: string) => void
}) {
  const presentation = connectorPresentation(connection.provider)
  const connected = connection.status === 'connected'

  return (
    <li>
      <button
        type="button"
        disabled={!connected}
        onClick={() => onSelect(connection.id)}
        title={connected ? undefined : "This connection isn't currently working"}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors",
          connected ? "hover:border-primary/40 hover:bg-accent/30" : "cursor-not-allowed opacity-60"
        )}
      >
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", presentation.accentClass)}>
          <presentation.icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{connection.name}</span>
            <Badge
              variant="outline"
              className={
                connected
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
              }
            >
              {connected ? "Connected" : "Not working"}
            </Badge>
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            Verified {formatRelativeTime(connection.lastVerifiedAt)}
          </span>
        </span>
      </button>
    </li>
  )
}
