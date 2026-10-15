import * as React from "react"
import { useParams } from "react-router-dom"
import { Database } from "lucide-react"

import { usePaths } from "@/hooks/usePaths"
import { defaultConnectionId, newestFirst, rememberConnection, useAcrossConnections } from "@/hooks/useAcrossConnections"
import { ContextQueryProvider } from "@/context/QueryProvider"
import { AdkChatWorkbench } from "@/components/common/agent/AdkChatWorkbench"
import { ContextPicker, type PublishedContextOption } from "@/components/common/agent/ContextPicker"
import { EmptyState, ErrorState, InlineLoading } from "@/components/common/States"
import { useAuth } from "@/context/authContext"
import {
  createDataAnalystSession,
  deleteAdkSession,
  getAdkSession,
  getAdkSessionUsage,
  interruptAdkSession,
  listAdkSessions,
  sendAdkMessage,
  uploadAdkArtifact,
} from "@/api/adk.api"

const AGENT = "data_analyst" as const

export default function DataAnalystPage() {
  return (
    <ContextQueryProvider>
      <DataAnalyst />
    </ContextQueryProvider>
  )
}

function DataAnalyst() {
  const { connectionId, sessionId } = useParams<{ connectionId?: string; sessionId?: string }>()
  const paths = usePaths()
  const all = useAcrossConnections((id) => listAdkSessions(id, AGENT), AGENT)
  const [context, setContext] = React.useState<PublishedContextOption | null>(null)
  const canPickContext = useAuth().can("context.read")
  const [opened, setOpened] = React.useState<{ sessionId: string; context: PublishedContextOption | null } | null>(null)
  const sessionContext = sessionId && opened?.sessionId === sessionId ? opened.context : null

  React.useEffect(() => {
    if (connectionId && sessionId) rememberConnection(connectionId)
  }, [connectionId, sessionId])

  const connections = all.connections ?? []
  const activeId =
    connectionId && sessionId
      ? connectionId
      : defaultConnectionId(all.connections, context?.connectionId ?? connectionId ?? null)
  const names = new Map(connections.map((c) => [c.id, c.name]))
  const sessions = all.items ? newestFirst(all.items.map((entry) => entry.item)) : null

  if (all.error && !all.connections) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <ErrorState error={all.error} title="Unable to load connections" onRetry={all.reload} />
      </div>
    )
  }
  if (!all.connections) {
    return (
      <div className="flex h-full min-h-[40vh] items-center justify-center p-6">
        <InlineLoading label="Loading…" />
      </div>
    )
  }
  if (!activeId) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <EmptyState
          title={connections.length ? "No working connection" : "No connections yet"}
          body={
            connections.length
              ? "None of your data connections is working right now. Verify one in the Metadata Lakehouse."
              : "Connect a data source in the Metadata Lakehouse first."
          }
          icon={Database}
        />
      </div>
    )
  }


  return (
    <AdkChatWorkbench
      sessionId={sessionId}
      basePath={(sid, ctx) => (sid ? paths.dataAnalyst(ctx ?? activeId, sid) : paths.dataAnalyst())}
      emptyTitle="Curious about something?"
      emptyBody="Ask away. Let's dig into the data together."
      placeholder="Ask a question about this data…"
      agentName="Data analyst"
      suggestions={[
        "What tables did you find?",
        "Summarize what needs review.",
        "What relationships exist between these tables?",
      ]}
      loadSession={(sid) =>
        getAdkSession(activeId, AGENT, sid).then((detail) => {
          setOpened({ sessionId: sid, context: contextFromState(detail.state) })
          return detail
        })
      }
      createSession={() => {
        rememberConnection(activeId)
        return createDataAnalystSession(
          activeId,
          context
            ? {
                contextIds: [context.connectionId],
                initialState: {
                  context_version_id: context.id,
                  context_connection_id: context.connectionId,
                  context_name: context.name,
                  context_version: context.version,
                },
              }
            : {}
        )
      }}
      sendMessage={(sid, text, artifactIds) => sendAdkMessage(activeId, AGENT, sid, { text, artifactIds })}
      interrupt={(sid) => interruptAdkSession(activeId, AGENT, sid)}
      getUsage={(sid) => getAdkSessionUsage(activeId, AGENT, sid)}
      uploadFile={(sid, file) => uploadAdkArtifact(activeId, AGENT, sid, file)}
      sessions={sessions}
      sessionLabel={(s) => names.get(s.contextId) ?? null}
      sessionsNotice={
        all.failed.length > 0 ? (
          <p className="mb-1 rounded-md bg-destructive/10 px-2 py-1.5 text-[11px] leading-snug text-destructive">
            Couldn&apos;t load chats for {all.failed.map((c) => c.name).join(', ')}.{' '}
            <button type="button" onClick={all.reload} className="cursor-pointer font-medium underline underline-offset-2">
              Retry
            </button>
          </p>
        ) : null
      }
      reloadSessions={all.reload}
      onDeleteSession={(sid) =>
        deleteAdkSession(sessions?.find((s) => s.sessionId === sid)?.contextId ?? activeId, AGENT, sid)
      }
      composerAccessory={
        canPickContext ? (
          <ContextPicker
            value={sessionId ? sessionContext : context}
            onChange={(next) => {
              if (!sessionId) setContext(next)
            }}
            disabled={Boolean(sessionId)}
            disabledHint="A chat keeps the context it started with. Start a new chat to choose another."
          />
        ) : null
      }
    />
  )
}

function contextFromState(state: Record<string, unknown>): PublishedContextOption | null {
  const id = state.context_version_id
  if (typeof id !== "string" || !id) return null
  const version = Number(state.context_version) || 0
  return {
    id,
    connectionId: String(state.context_connection_id ?? ""),
    connectionName: String(state.context_name ?? ""),
    name: String(state.context_name ?? "Context"),
    version,
    label: `v${version}`,
    live: false,
    publishedAt: "",
  }
}
