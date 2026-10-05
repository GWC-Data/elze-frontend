import { useLocation, useNavigate, useParams } from "react-router-dom"

import { usePaths } from "@/hooks/usePaths"
import { useAsync } from "@/hooks/useAsync"
import { ConnectionPicker } from "@/components/common/agent/ConnectionPicker"
import { AdkChatWorkbench } from "@/components/common/agent/AdkChatWorkbench"
import {
  createPlaybookBuilderSession,
  deletePlaybookBuilderSession,
  getPlaybookBuilderSession,
  getPlaybookBuilderSessionUsage,
  interruptPlaybookBuilderSession,
  listPlaybookBuilderSessions,
  sendPlaybookBuilderMessage,
} from "@/api/adk.api"

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
  const sessionsQuery = useAsync(() => listPlaybookBuilderSessions(connectionId), [connectionId])

  const autoSendMessage = (location.state as { autoSendMessage?: string } | null)?.autoSendMessage

  return (
    <AdkChatWorkbench
      sessionId={sessionId}
      basePath={(sid) => paths.playbookBuilder(connectionId, sid)}
      emptyTitle="What playbook do you want to build?"
      emptyBody="Describe the recurring report or analysis you need — let's turn it into a playbook."
      placeholder="Describe the playbook you want to build…"
      loadSession={(sid) => getPlaybookBuilderSession(connectionId, sid)}
      createSession={() => createPlaybookBuilderSession(connectionId)}
      sendMessage={(sid, text) => sendPlaybookBuilderMessage(connectionId, sid, text)}
      interrupt={(sid) => interruptPlaybookBuilderSession(connectionId, sid)}
      getUsage={(sid) => getPlaybookBuilderSessionUsage(connectionId, sid)}
      sessions={sessionsQuery.error ? [] : sessionsQuery.data}
      reloadSessions={sessionsQuery.reload}
      onDeleteSession={(sid) => deletePlaybookBuilderSession(connectionId, sid)}
      initialAutoSend={autoSendMessage}
    />
  )
}
