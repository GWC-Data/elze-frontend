import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  ArrowUp,
  BarChart3,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  Square,
  Trash2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { notify } from "@/lib/notify"
import { useAsync } from "@/hooks/useAsync"
import { Button } from "@/components/ui/workbench/button"
import { Input } from "@/components/ui/workbench/input"
import { Skeleton } from "@/components/ui/workbench/skeleton"
import { MarkdownText } from "@/components/common/agent/tools/MarkdownText"
import { ErrorState, InlineLoading } from "@/components/common/States"
import type {
  AdkArtifact,
  AdkChatResponse,
  AdkInterruptResult,
  AdkSessionDetail,
  AdkSessionSummary,
  AdkSessionUsage,
} from "@/types/adk"

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

type Turn =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "agent"; text: string; toolCalls: string[]; interrupted: boolean }
  | { id: string; role: "error"; text: string }

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Session ids are internal and never shown in the UI.
function formatUsage(usage: AdkSessionUsage): string {
  const entries = Object.entries(usage).filter(([key]) => !/session/i.test(key))
  if (entries.length === 0) return "No usage reported for this session yet."
  return entries
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" · ")
}

export interface AdkChatWorkbenchProps {
  sessionId?: string
  basePath: (sessionId?: string) => string
  emptyTitle: string
  emptyBody: string
  placeholder: string
  suggestions?: string[]
  loadSession: (sessionId: string) => Promise<AdkSessionDetail>
  createSession: () => Promise<AdkSessionSummary>
  sendMessage: (sessionId: string, text: string, artifactIds?: string[]) => Promise<AdkChatResponse>
  interrupt: (sessionId: string) => Promise<AdkInterruptResult>
  getUsage: (sessionId: string) => Promise<AdkSessionUsage>
  uploadFile?: (sessionId: string, file: File) => Promise<AdkArtifact>
  sessions: AdkSessionSummary[] | null
  reloadSessions: () => void
  onDeleteSession?: (sessionId: string) => Promise<void>
  // Rendered beside the attach button (e.g. the Data analyst's context picker).
  composerAccessory?: React.ReactNode
  // Sent once, automatically, the first time this mounts with no existing
  // session — the "open a chat with a request already typed" flow (e.g.
  // promoting a draft playbook).
  initialAutoSend?: string
}

// Shared chat loop for the two ADK-backed workbench pages (Data Analyst,
// Playbook Builder) — same session-history sidebar + turn list + pending
// spinner (no live streaming, per UnderstandChatWidget's proven pattern) +
// interrupt + usage + optional inline attach.
export function AdkChatWorkbench({
  sessionId,
  basePath,
  emptyTitle,
  emptyBody,
  placeholder,
  suggestions = [],
  loadSession,
  createSession,
  sendMessage,
  interrupt,
  getUsage,
  uploadFile,
  sessions,
  reloadSessions,
  onDeleteSession,
  composerAccessory,
  initialAutoSend,
}: AdkChatWorkbenchProps) {
  const navigate = useNavigate()
  const [message, setMessage] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [attachments, setAttachments] = React.useState<AdkArtifact[]>([])
  const [isAttaching, setIsAttaching] = React.useState(false)
  const [usage, setUsage] = React.useState<AdkSessionUsage | null>(null)
  const [usageOpen, setUsageOpen] = React.useState(false)
  const [usageLoading, setUsageLoading] = React.useState(false)
  const [deletingSessionId, setDeletingSessionId] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const endRef = React.useRef<HTMLDivElement>(null)

  // Server history for the open chat, plus what this view has sent since. `local`
  // is keyed by conversation so switching chats never shows another chat's turns,
  // and the "new chat" → "just-created session" transition carries turns over
  // instead of losing them (the key changes to the real session id at that point,
  // via the same setLocal call that already holds the right turns).
  const viewKey = sessionId ?? "new"
  const history = useAsync(() => (sessionId ? loadSession(sessionId) : Promise.resolve(null)), [sessionId])
  const historyTurns = React.useMemo<Turn[]>(() => {
    if (!history.data) return []
    return history.data.turns.map((turn) => ({
      id: crypto.randomUUID(),
      role: turn.role === "user" ? "user" : "agent",
      text: turn.text,
      ...(turn.role === "user" ? {} : { toolCalls: [], interrupted: false }),
    })) as Turn[]
  }, [history.data])
  const [local, setLocal] = React.useState<{ key: string; items: Turn[] } | null>(null)
  const hasLocal = local !== null && local.key === viewKey
  const turns = hasLocal ? local.items : historyTurns
  const historyLoading = !hasLocal && Boolean(sessionId) && history.loading
  const historyError = hasLocal ? null : history.error

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [turns.length, isSending])

  const submit = async (rawText: string) => {
    const text = rawText.trim()
    if (isSending || (!text && attachments.length === 0)) return

    const base = turns
    let key = viewKey
    setIsSending(true)
    setLocal({
      key,
      items: [
        ...base,
        {
          id: crypto.randomUUID(),
          role: "user",
          text: text || `Attached ${attachments.length} file${attachments.length === 1 ? "" : "s"}.`,
        },
      ],
    })
    const artifactIds = attachments.map((a) => a.id)
    setAttachments([])

    let activeSession = sessionId
    if (!activeSession) {
      try {
        const created = await createSession()
        activeSession = created.sessionId
        key = created.sessionId
        setLocal((prev) => (prev ? { key, items: prev.items } : prev))
        navigate(basePath(activeSession), { replace: true })
      } catch {
        setIsSending(false)
        setLocal((prev) => (prev && prev.key === viewKey ? { key, items: base } : prev))
        return
      }
    }

    try {
      const response = await sendMessage(activeSession, text, artifactIds.length ? artifactIds : undefined)
      setLocal((prev) =>
        prev && prev.key === key
          ? {
              key,
              items: [
                ...prev.items,
                {
                  id: crypto.randomUUID(),
                  role: "agent",
                  text: response.text || (response.interrupted ? "Stopped." : ""),
                  toolCalls: response.toolCalls,
                  interrupted: response.interrupted,
                },
              ],
            }
          : prev
      )
      reloadSessions()
    } catch {
      setLocal((prev) =>
        prev && prev.key === key
          ? {
              key,
              items: [
                ...prev.items,
                { id: crypto.randomUUID(), role: "error", text: "Couldn't reach the agent. Please try again." },
              ],
            }
          : prev
      )
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const text = message
    setMessage("")
    void submit(text)
  }

  const autoSentRef = React.useRef(false)
  React.useEffect(() => {
    if (!initialAutoSend || autoSentRef.current || sessionId || historyLoading) return
    autoSentRef.current = true
    void submit(initialAutoSend)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAutoSend, sessionId, historyLoading])

  const handleStop = async () => {
    if (!sessionId) return
    try {
      await interrupt(sessionId)
    } catch {
      // The in-flight send() still resolves either way.
    }
  }

  const handleFile = async (file: File | null) => {
    if (!file || !uploadFile) return
    if (file.size > MAX_UPLOAD_BYTES) {
      notify.error("That file is too large.", "The limit is 10 MB.")
      return
    }
    setIsAttaching(true)
    try {
      let activeSession = sessionId
      if (!activeSession) {
        const created = await createSession()
        activeSession = created.sessionId
        navigate(basePath(activeSession), { replace: true })
      }
      const artifact = await uploadFile(activeSession, file)
      setAttachments((prev) => [...prev, artifact])
    } catch (err) {
      notify.failure("attach that file", err)
    } finally {
      setIsAttaching(false)
    }
  }

  const toggleUsage = async () => {
    if (usageOpen) {
      setUsageOpen(false)
      return
    }
    setUsageOpen(true)
    if (!sessionId) return
    setUsageLoading(true)
    try {
      setUsage(await getUsage(sessionId))
    } catch (err) {
      notify.failure("load usage for this chat", err)
      setUsageOpen(false)
    } finally {
      setUsageLoading(false)
    }
  }

  const handleDelete = async (entry: AdkSessionSummary) => {
    if (!onDeleteSession || deletingSessionId) return
    setDeletingSessionId(entry.sessionId)
    try {
      await onDeleteSession(entry.sessionId)
      reloadSessions()
      if (entry.sessionId === sessionId) navigate(basePath())
    } catch {
      toast.error("Couldn't delete that chat.")
    } finally {
      setDeletingSessionId(null)
    }
  }

  const showEmptyState = !historyLoading && !historyError && turns.length === 0 && !isSending

  return (
    <div className="agent-workbench flex h-full bg-background text-sm leading-loose">
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-card sm:flex">
        <div className="p-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full cursor-pointer gap-1.5"
            onClick={() => navigate(basePath())}
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
                const active = entry.sessionId === sessionId
                const label = entry.lastUpdateTime
                  ? new Date(entry.lastUpdateTime * 1000).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "New chat"
                return (
                  <li key={entry.sessionId} className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => navigate(basePath(entry.sessionId))}
                      className={cn(
                        "flex-1 truncate rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                    {onDeleteSession && (
                      <button
                        type="button"
                        aria-label="Delete chat"
                        disabled={deletingSessionId === entry.sessionId}
                        onClick={() => void handleDelete(entry)}
                        className="cursor-pointer rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 disabled:opacity-100"
                      >
                        {deletingSessionId === entry.sessionId ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-end gap-1 border-b bg-card px-4 py-2">
          <button
            type="button"
            aria-label="Session usage"
            disabled={!sessionId}
            onClick={() => void toggleUsage()}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <BarChart3 className="size-4" />
          </button>
        </div>

        {usageOpen && (
          <div className="shrink-0 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
            {usageLoading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-3 animate-spin" /> Loading usage…
              </span>
            ) : usage ? (
              formatUsage(usage)
            ) : (
              "Send a message to see usage for this chat."
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {historyLoading ? (
            <InlineLoading label="Loading conversation…" />
          ) : historyError ? (
            <ErrorState error={historyError} title="Couldn't load this conversation" />
          ) : showEmptyState ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex flex-col gap-1 text-muted-foreground">
                <span className="text-base font-semibold text-card-foreground">{emptyTitle}</span>
                <span>{emptyBody}</span>
              </div>
              {suggestions.length > 0 && (
                <div className="mt-2 flex w-full max-w-md flex-col gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void submit(suggestion)}
                      className="cursor-pointer rounded-xl border bg-card px-3 py-2 text-left text-sm text-foreground hover:border-foreground/30 hover:bg-accent/30"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-3">
              {turns.map((turn) => (
                <TurnBubble key={turn.id} turn={turn} />
              ))}
              {isSending && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Thinking…
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t bg-card px-3 pt-2">
            {attachments.map((artifact) => (
              <span
                key={artifact.id}
                className="flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-xs text-foreground"
              >
                <Paperclip className="size-3 shrink-0" />
                <span className="max-w-32 truncate">{artifact.filename}</span>
                <span className="text-muted-foreground">{formatSize(artifact.sizeBytes)}</span>
              </span>
            ))}
          </div>
        )}

        <div className="relative z-10 w-full border-t bg-card">
          <form className="flex items-center gap-2 p-4" onSubmit={handleSubmit}>
            {uploadFile && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 shrink-0 cursor-pointer rounded-full"
                aria-label="Attach a file"
                disabled={isAttaching}
                onClick={() => fileInputRef.current?.click()}
              >
                {isAttaching ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
              </Button>
            )}
            {uploadFile && (
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  void handleFile(event.target.files?.[0] ?? null)
                  event.target.value = ""
                }}
              />
            )}
            {composerAccessory}
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={placeholder}
              className="h-10 flex-1 rounded-full px-4"
            />
            {isSending ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-10 shrink-0 cursor-pointer rounded-full"
                aria-label="Stop"
                onClick={() => void handleStop()}
              >
                <Square className="size-3.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                className="size-10 shrink-0 cursor-pointer rounded-full"
                aria-label="Send"
                disabled={!message.trim() && attachments.length === 0}
              >
                <ArrowUp className="size-4" />
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

function TurnBubble({ turn }: { turn: Turn }) {
  if (turn.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[75%] rounded-2xl bg-primary px-3 py-1.5 text-sm whitespace-pre-wrap text-primary-foreground">
          {turn.text}
        </p>
      </div>
    )
  }

  if (turn.role === "error") {
    return (
      <div className="flex justify-start">
        <p className="max-w-[75%] rounded-2xl bg-destructive/10 px-3 py-1.5 text-sm text-destructive">{turn.text}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="max-w-[80%] rounded-2xl bg-muted px-3 py-1.5 text-sm text-foreground">
        <MarkdownText text={turn.text} />
      </div>
      {turn.toolCalls.length > 0 && (
        <span className="px-1 text-[11px] text-muted-foreground">Used: {turn.toolCalls.join(", ")}</span>
      )}
      {turn.interrupted && <span className="px-1 text-[11px] text-muted-foreground">Stopped early.</span>}
    </div>
  )
}
