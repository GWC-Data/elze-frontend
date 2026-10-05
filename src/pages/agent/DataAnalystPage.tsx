import * as React from "react"
import { useNavigate, useParams } from "react-router-dom"

import { usePaths } from "@/hooks/usePaths"
import { useAsync } from "@/hooks/useAsync"
import { ConnectionPicker } from "@/components/common/agent/ConnectionPicker"
import { AdkChatWorkbench } from "@/components/common/agent/AdkChatWorkbench"
import { ContextPicker, type PublishedContextOption } from "@/components/common/agent/ContextPicker"
import { useAuth } from "@/context/authContext"
import {
  createAdkSession,
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
  const { connectionId, sessionId } = useParams<{ connectionId?: string; sessionId?: string }>()
  const navigate = useNavigate()
  const paths = usePaths()

  if (!connectionId) {
    return <ConnectionPicker onSelect={(id) => navigate(paths.dataAnalyst(id))} />
  }

  return <DataAnalystChat connectionId={connectionId} sessionId={sessionId} />
}

function DataAnalystChat({ connectionId, sessionId }: { connectionId: string; sessionId?: string }) {
  const paths = usePaths()
  const sessionsQuery = useAsync(() => listAdkSessions(connectionId, AGENT), [connectionId])
  // The published context version to answer from. None by default. It is fixed when a chat
  // starts (sent as the session's initial state), so it can only be changed on a new chat.
  const [context, setContext] = React.useState<PublishedContextOption | null>(null)
  const canPickContext = useAuth().can("context.read")
  // An existing chat shows the context it was started with, read from its session state.
  const [opened, setOpened] = React.useState<{ sessionId: string; context: PublishedContextOption | null } | null>(null)
  const sessionContext = sessionId && opened?.sessionId === sessionId ? opened.context : null

  return (
    <AdkChatWorkbench
      sessionId={sessionId}
      basePath={(sid) => paths.dataAnalyst(connectionId, sid)}
      emptyTitle="Curious about something?"
      emptyBody="Ask away — let's dig into the data together."
      placeholder="Ask a question about this data…"
      suggestions={[
        "What tables did you find?",
        "Summarize what needs review.",
        "What relationships exist between these tables?",
      ]}
      loadSession={(sid) =>
        getAdkSession(connectionId, AGENT, sid).then((detail) => {
          setOpened({ sessionId: sid, context: contextFromState(detail.state) })
          return detail
        })
      }
      createSession={() =>
        createAdkSession(
          connectionId,
          AGENT,
          context
            ? {
                context_version_id: context.id,
                context_connection_id: context.connectionId,
                context_name: context.name,
                context_version: context.version,
              }
            : undefined
        )
      }
      sendMessage={(sid, text, artifactIds) => sendAdkMessage(connectionId, AGENT, sid, { text, artifactIds })}
      interrupt={(sid) => interruptAdkSession(connectionId, AGENT, sid)}
      getUsage={(sid) => getAdkSessionUsage(connectionId, AGENT, sid)}
      uploadFile={(sid, file) => uploadAdkArtifact(connectionId, AGENT, sid, file)}
      sessions={sessionsQuery.error ? [] : sessionsQuery.data}
      reloadSessions={sessionsQuery.reload}
      onDeleteSession={(sid) => deleteAdkSession(connectionId, AGENT, sid)}
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

// The picker's option, rebuilt from what createSession stored; null when the chat had none.
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
