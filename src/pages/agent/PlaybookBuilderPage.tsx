import { useLocation, useNavigate, useParams } from "react-router-dom"

import { usePaths } from "@/hooks/usePaths"
import { useAsync } from "@/hooks/useAsync"
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

  return <PlaybookBuilderChat connectionId={connectionId} sessionId={sessionId} />
}

function PlaybookBuilderChat({ connectionId, sessionId }: { connectionId: string; sessionId?: string }) {
  const paths = usePaths()
  const location = useLocation()
  const sessionsQuery = useAsync(() => listAdkSessions(connectionId, AGENT), [connectionId])

  const autoSendMessage = (location.state as { autoSendMessage?: string } | null)?.autoSendMessage

  return (
    <AdkChatWorkbench
      sessionId={sessionId}
      basePath={(sid) => paths.playbookBuilder(connectionId, sid)}
      emptyTitle="What playbook do you want to build?"
      emptyBody="Describe the recurring report or analysis you need — let's turn it into a playbook."
      placeholder="Describe the playbook you want to build…"
      loadSession={(sid) => getAdkSession(connectionId, AGENT, sid)}
      createSession={() => createPlaybookBuilderSession(connectionId)}
      sendMessage={(sid, text) => sendAdkMessage(connectionId, AGENT, sid, { text })}
      interrupt={(sid) => interruptAdkSession(connectionId, AGENT, sid)}
      getUsage={(sid) => getAdkSessionUsage(connectionId, AGENT, sid)}
      sessions={sessionsQuery.error ? [] : sessionsQuery.data}
      reloadSessions={sessionsQuery.reload}
      onDeleteSession={(sid) => deleteAdkSession(connectionId, AGENT, sid)}
      initialAutoSend={autoSendMessage}
    />
  )
}
