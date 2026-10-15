import { useLocation, useNavigate, useParams } from "react-router-dom"

import { usePaths } from "@/hooks/usePaths"
import { newestFirst, rememberConnection, useAcrossConnections } from "@/hooks/useAcrossConnections"
import { ContextQueryProvider } from "@/context/QueryProvider"
import { ConnectionPicker } from "@/components/common/agent/ConnectionPicker"
import { AdkChatWorkbench } from "@/components/common/agent/AdkChatWorkbench"
import {
  createPlaybookBuilderSession,
  deleteAdkSession,
  getAdkSession,
  getAdkSessionUsage,
  interruptAdkSession,
  listAdkSessions,
  sendAdkMessage,
} from "@/api/adk.api"

const AGENT = "playbook_builder" as const

export default function PlaybookBuilderPage() {
  const { connectionId, sessionId } = useParams<{ connectionId?: string; sessionId?: string }>()
  const navigate = useNavigate()
  const paths = usePaths()

  if (!connectionId) {
    return <ConnectionPicker onSelect={(id) => navigate(paths.playbookBuilder(id))} />
  }

  return (
    <ContextQueryProvider>
      <PlaybookBuilderChat connectionId={connectionId} sessionId={sessionId} />
    </ContextQueryProvider>
  )
}

function PlaybookBuilderChat({ connectionId, sessionId }: { connectionId: string; sessionId?: string }) {
  const paths = usePaths()
  const location = useLocation()
  const all = useAcrossConnections((id) => listAdkSessions(id, AGENT), AGENT)
  const connections = all.connections ?? []
  const names = new Map(connections.map((c) => [c.id, c.name]))
  const sessions = all.items ? newestFirst(all.items.map((entry) => entry.item)) : null

  const autoSendMessage = (location.state as { autoSendMessage?: string } | null)?.autoSendMessage

  return (
    <AdkChatWorkbench
      sessionId={sessionId}
      basePath={(sid, ctx) => paths.playbookBuilder(sid ? ctx ?? connectionId : connectionId, sid)}
      emptyTitle="What playbook do you want to build?"
      emptyBody="Describe the recurring report or analysis you need, and we'll turn it into a playbook."
      placeholder="Describe the playbook you want to build…"
      agentName="Playbook builder"
      loadSession={(sid) => getAdkSession(connectionId, AGENT, sid)}
      createSession={() => {
        rememberConnection(connectionId)
        return createPlaybookBuilderSession(connectionId)
      }}
      sendMessage={(sid, text) => sendAdkMessage(connectionId, AGENT, sid, { text })}
      interrupt={(sid) => interruptAdkSession(connectionId, AGENT, sid)}
      getUsage={(sid) => getAdkSessionUsage(connectionId, AGENT, sid)}
      sessions={sessions}
      sessionLabel={connections.length > 1 ? (s) => names.get(s.contextId) ?? null : undefined}
      reloadSessions={all.reload}
      onDeleteSession={(sid) =>
        deleteAdkSession(sessions?.find((s) => s.sessionId === sid)?.contextId ?? connectionId, AGENT, sid)
      }
      initialAutoSend={autoSendMessage}
    />
  )
}
