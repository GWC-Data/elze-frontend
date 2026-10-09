import * as React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { AlarmClock, ArrowLeft, ArrowUp, BrainCircuit, Layers, Loader2, MessageSquarePlus, Pencil, Trash2 } from "lucide-react"

import { AgentLibraryError, agentLibraryApi } from "@/api/agentLibrary.api"
import { libraryChatApi, libraryChatAvailable } from "@/api/agentLibraryChat.api"
import { useAsync } from "@/hooks/useAsync"
import { usePaths } from "@/hooks/usePaths"
import { useAuth } from "@/context/authContext"
import { agentAccess } from "@/lib/agentAccess"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/workbench/button"
import { Input } from "@/components/ui/workbench/input"
import { Skeleton } from "@/components/ui/workbench/skeleton"
import { MessageIdentity, ThinkingSection } from "@/components/common/agent/ThinkingSection"
import { downloadTextMessage, MessageRow } from "@/components/common/agent/MessageRow"
import { exportToolDataAsPdf } from "@/components/common/agent/tools/PdfExportTemplate"
import { ScheduleDialog } from "@/components/common/agent-library/ScheduleDialog"
import { ChatBalloon } from "@/components/common/agent/ChatBalloon"
import { InlineLoading, NotFoundState, ErrorState } from "@/components/common/States"
import type { ChatMessage } from "@/types/agent"
import type { ToolEngineData } from "@/types/agentTools"
import type { LibraryAgent, LibraryChatSession } from "@/types/agentLibrary"

export default function LibraryAgentChatPage() {
  const { agentId = "", sessionId } = useParams<{ agentId: string; sessionId?: string }>()
  const paths = usePaths()
  const navigate = useNavigate()
  const { can, user } = useAuth()

  const loaded = useAsync(() => agentLibraryApi.get(agentId), [agentId])
  const [latest, setLatest] = React.useState<LibraryAgent | null>(null)
  const agent = latest && latest.id === agentId ? latest : loaded.data

  const [isSending, setIsSending] = React.useState(false)
  const [thoughts, setThoughts] = React.useState<string[]>([])
  const [message, setMessage] = React.useState("")
  const [exportingKey, setExportingKey] = React.useState<string | null>(null)
  const [deletingSessionId, setDeletingSessionId] = React.useState<string | null>(null)
  const [scheduleOpen, setScheduleOpen] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const sessionsQuery = useAsync(
    () => (agent && libraryChatAvailable ? libraryChatApi.listSessions(agent) : Promise.resolve(null)),
    [agent?.id ?? null]
  )
  const sessions = agent ? (sessionsQuery.error ? [] : sessionsQuery.data) : null

  const viewKey = sessionId ?? "new"
  const history = useAsync(
    () =>
      agent && sessionId && libraryChatAvailable
        ? libraryChatApi.listMessages(agent, sessionId)
        : Promise.resolve([] as ChatMessage[]),
    [agent?.id ?? null, sessionId ?? null]
  )
  const [local, setLocal] = React.useState<{ key: string; items: ChatMessage[] } | null>(null)
  const hasLocal = local !== null && local.key === viewKey
  const messages = hasLocal ? local.items : (history.data ?? [])
  const historyStatus: "loading" | "success" | "error" = hasLocal
    ? "success"
    : history.loading
      ? "loading"
      : history.error
        ? "error"
        : "success"

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length, isSending, thoughts.length])

  const submitMessage = async (text: string) => {
    if (!agent || !text || isSending) return false
    if (!libraryChatAvailable) {
      toast("This agent can't reply yet", { description: "Agent chat is coming soon." })
      return false
    }
    const base = messages
    const asked: ChatMessage = { author: "user", text, timestamp: Date.now() / 1000 }
    let key = viewKey
    setLocal({ key, items: [...base, asked] })
    setIsSending(true)
    setThoughts([])

    let activeSession = sessionId
    if (!activeSession) {
      try {
        const created = await libraryChatApi.createSession(agent)
        activeSession = created.id
        key = created.id
        setLocal({ key, items: [...base, asked] })
        navigate(paths.libraryAgent(agent.id, created.id), { replace: true })
      } catch {
        setLocal({ key, items: base })
        setIsSending(false)
        toast.error("Couldn't start a chat with this agent.")
        return false
      }
    }

    const startedAt = Date.now()
    const collected: string[] = []
    try {
      const replies = await libraryChatApi.send(agent, activeSession, text, (thought) => {
        collected.push(thought)
        setThoughts((prev) => [...prev, thought])
      })
      const thinkingSeconds = Math.round((Date.now() - startedAt) / 1000)
      const answered = replies.map((item, index) =>
        index === 0 && collected.length ? { ...item, thoughts: collected, thinkingSeconds } : item
      )
      setLocal((prev) => (prev && prev.key === key ? { key, items: [...prev.items, ...answered] } : prev))
    } catch {
      toast.error("The agent couldn't answer. Please try again.")
    } finally {
      setIsSending(false)
      setThoughts([])
      sessionsQuery.reload()
    }
    return true
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const text = message.trim()
    if (!text || isSending) return
    setMessage("")
    const sent = await submitMessage(text)
    if (!sent) setMessage(text)
  }

  const handleDeleteSession = async (entry: LibraryChatSession) => {
    if (!agent || deletingSessionId) return
    setDeletingSessionId(entry.id)
    try {
      await libraryChatApi.deleteSession(agent, entry.id)
      sessionsQuery.reload()
      if (entry.id === sessionId) navigate(paths.libraryAgent(agent.id))
    } catch {
      toast.error("Couldn't delete that chat.")
    } finally {
      setDeletingSessionId(null)
    }
  }

  const handleDownload = async (
    key: string,
    item: ChatMessage,
    toolData: ToolEngineData | null,
    isJsonData: boolean
  ) => {
    if (exportingKey) return
    if (toolData) {
      setExportingKey(key)
      try {
        await exportToolDataAsPdf(toolData, `agent-response-${item.timestamp}`)
      } catch (error) {
        console.error("Failed to export message as PDF", error)
      } finally {
        setExportingKey(null)
      }
      return
    }
    downloadTextMessage(item, isJsonData)
  }

  if (loaded.error && !agent) {
    const missing = loaded.error instanceof AgentLibraryError && loaded.error.status === 404
    return missing ? (
      <NotFoundState detail="This agent does not exist. It may have been deleted." backTo={paths.agentLibrary} />
    ) : (
      <ErrorState error={loaded.error} title="Unable to load the agent" onRetry={loaded.reload} />
    )
  }

  if (!agent) return <InlineLoading label="Loading agent…" />

  const isHistoryLoading = historyStatus === "loading"
  const showEmptyState = !isHistoryLoading && historyStatus !== "error" && messages.length === 0 && !isSending
  const contextNames = agent.knowledge.map((ref) => ref.name).join(", ")

  return (
    <div className="agent-workbench flex h-full bg-background text-sm leading-loose">
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-card sm:flex">
        <div className="p-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full cursor-pointer gap-1.5"
            onClick={() => navigate(paths.libraryAgent(agent.id))}
          >
            <MessageSquarePlus className="size-3.5" />
            New chat
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
          {sessions === null ? (
            <div className="flex flex-col gap-1.5 p-2">
              <Skeleton className="h-7 w-full rounded-md" />
              <Skeleton className="h-7 w-full rounded-md" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">No chats yet.</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {sessions.map((entry) => {
                const active = entry.id === sessionId
                const label =
                  entry.title ||
                  new Date(entry.updatedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                return (
                  <li key={entry.id} className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => navigate(paths.libraryAgent(agent.id, entry.id))}
                      className={cn(
                        "flex-1 truncate rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                    <button
                      type="button"
                      aria-label="Delete chat"
                      disabled={deletingSessionId === entry.id}
                      onClick={() => void handleDeleteSession(entry)}
                      className="cursor-pointer rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 disabled:opacity-100"
                    >
                      {deletingSessionId === entry.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-card px-6 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 shrink-0 cursor-pointer gap-1"
              onClick={() => navigate(paths.agentLibrary)}
              aria-label="Back to all agents"
            >
              <ArrowLeft className="size-3.5" />
              Agents
            </Button>
            <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
            <BrainCircuit className="size-4 shrink-0 text-primary" />
            <span className="truncate font-semibold text-card-foreground">{agent.name}</span>
            <span className="hidden min-w-0 items-center gap-1 truncate text-xs text-muted-foreground md:flex">
              <Layers className="size-3 shrink-0" />
              <span className="truncate">
                {agent.knowledge.map((ref) => `${ref.name} ${ref.label}`).join(" · ")}
              </span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {agentAccess(agent, user?.id, can).schedule ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer gap-1.5"
                onClick={() => setScheduleOpen(true)}
              >
                <AlarmClock className="size-3.5" />
                {agent.schedule ? "Edit schedule" : "Schedule"}
              </Button>
            ) : null}
            {agentAccess(agent, user?.id, can).edit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer gap-1.5"
                onClick={() => navigate(paths.libraryAgentEdit(agent.id))}
              >
                <Pencil className="size-3.5" />
                Edit agent
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6 pb-4">
          <div className="min-h-0 flex-1 overflow-auto p-4">
            {showEmptyState ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <ChatBalloon />
                <div className="flex flex-col gap-1 text-muted-foreground">
                  <span className="text-base font-semibold text-card-foreground">Ask {agent.name} anything</span>
                  <span>
                    {agent.description || `It answers from ${contextNames || "its published contexts"}.`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex min-w-0 flex-col gap-3">
                {isHistoryLoading && messages.length === 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col items-start gap-1">
                      <Skeleton className="h-9 w-2/5 rounded-2xl" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Skeleton className="h-9 w-1/3 rounded-2xl" />
                    </div>
                  </div>
                )}
                {historyStatus === "error" && (
                  <span className="text-xs text-destructive">Couldn&apos;t load this conversation.</span>
                )}
                {messages.map((item, index) => (
                  <MessageRow
                    key={`${item.timestamp}-${index}`}
                    item={item}
                    index={index}
                    exportingKey={exportingKey}
                    interactive={index === messages.length - 1 && !isSending}
                    onSendMessage={(text) => void submitMessage(text)}
                    onDownload={handleDownload}
                  />
                ))}
                {isSending && (
                  <div className="flex min-w-0 flex-col items-start gap-1">
                    <MessageIdentity isUser={false} />
                    <ThinkingSection thoughts={thoughts} alwaysShow />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 w-full border-t bg-card">
          <form className="flex items-center gap-2 p-4" onSubmit={handleSubmit}>
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={`Ask ${agent.name} about ${contextNames || "its contexts"}…`}
              className="h-10 flex-1 rounded-full px-4"
            />
            <Button
              type="submit"
              size="icon"
              className="size-10 shrink-0 cursor-pointer rounded-full"
              aria-label="Send"
              disabled={isSending || !message.trim()}
            >
              <ArrowUp className="size-4" />
            </Button>
          </form>
        </div>
      </div>

      <ScheduleDialog
        key={scheduleOpen ? `${agent.id}:open` : "closed"}
        agent={scheduleOpen ? agent : null}
        onOpenChange={setScheduleOpen}
        onSaved={setLatest}
      />
    </div>
  )
}
