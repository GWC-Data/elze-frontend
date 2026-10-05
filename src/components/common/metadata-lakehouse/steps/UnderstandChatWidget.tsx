import * as React from 'react'
import { ArrowUp, BarChart3, Loader2, Paperclip, Sparkles, Square, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MarkdownText } from '@/components/common/agent/tools/MarkdownText'
import {
  createAdkSession,
  getAdkSession,
  getAdkSessionUsage,
  interruptAdkSession,
  sendAdkMessage,
  uploadAdkArtifact,
} from '@/api/adk.api'
import type { AdkArtifact, AdkChatTurn, AdkSessionUsage } from '@/types/adk'

const AGENT = 'context_layer_extractor' as const
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const SUGGESTIONS = [
  'What tables did you find?',
  'Summarize what needs review.',
  'What relationships exist between these tables?',
]

type Turn =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'agent'; text: string; toolCalls: string[]; interrupted: boolean }
  | { id: string; role: 'error'; text: string }

// The extraction session's history as chat turns, minus the extraction itself: its first user
// turn is the extraction request (built server-side from the dataset ids) and everything up to
// the next user turn is the agent's run and report - already shown on the page. What follows is
// earlier chat in this same session.
function chatTurnsAfterExtraction(turns: AdkChatTurn[]): Turn[] {
  const userAt = turns.map((t, i) => (t.role === 'user' ? i : -1)).filter((i) => i >= 0)
  if (userAt.length < 2) return []
  return turns.slice(userAt[1]).map((t) =>
    t.role === 'user'
      ? { id: crypto.randomUUID(), role: 'user' as const, text: t.text }
      : { id: crypto.randomUUID(), role: 'agent' as const, text: t.text, toolCalls: [], interrupted: false }
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Session ids are internal and never shown in the UI.
function formatUsage(usage: AdkSessionUsage): string {
  const entries = Object.entries(usage).filter(([key]) => !/session/i.test(key))
  if (entries.length === 0) return 'No usage reported for this session yet.'
  return entries.map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`).join(' · ')
}

// A docked side panel, not a floating popup — mirrors a browser side-panel assistant
// (open next to the page, full height, header + messages + input). Talks to the
// context_layer_extractor ADK agent (adk.api.ts) — the same one that ran the
// extraction this step shows — the same way extraction.api.ts does: workspace
// id = this connection's id. Open/close is controlled by the parent so the
// toggle button can live in the step header instead of floating on the page.
//
// It continues the EXTRACTION's own session (`extractionSessionId`, recorded on the draft
// when the analysis ran), so the agent answers with that run's conversation in context and
// a reload picks the chat up where it was. Only a context never analysed starts a new one.
// The parent remounts it (key) when a re-run records a new session.
export function UnderstandChatWidget({
  connectionId,
  extractionSessionId,
  open,
  onOpenChange,
  focusTable,
}: {
  connectionId: string
  extractionSessionId?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  // Set by a "Ask about this data" button on one table's card: prefills the
  // composer so the question is scoped to that table, without auto-sending —
  // the user still reviews/edits it before it goes anywhere.
  focusTable?: string | null
}) {
  const [sessionId, setSessionId] = React.useState<string | undefined>(extractionSessionId || undefined)
  const [turns, setTurns] = React.useState<Turn[]>([])
  const [historyLoaded, setHistoryLoaded] = React.useState(!extractionSessionId)
  const [message, setMessage] = React.useState('')
  // Adjusted during render (React's documented pattern for "sync state to a
  // changed prop" without an effect) rather than reactively in an effect.
  const [seededTable, setSeededTable] = React.useState<string | null | undefined>(undefined)
  if (focusTable && focusTable !== seededTable) {
    setSeededTable(focusTable)
    setMessage(`Tell me about the "${focusTable}" table.`)
  }
  const [isSending, setIsSending] = React.useState(false)
  const [attachments, setAttachments] = React.useState<AdkArtifact[]>([])
  const [isAttaching, setIsAttaching] = React.useState(false)
  const [usage, setUsage] = React.useState<AdkSessionUsage | null>(null)
  const [usageOpen, setUsageOpen] = React.useState(false)
  const [usageLoading, setUsageLoading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const endRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'end' })
  }, [turns.length, isSending, open])

  // Escape closes the panel, like clicking outside it.
  React.useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  // Earlier chat in the extraction session, loaded the first time the panel opens.
  React.useEffect(() => {
    if (!open || historyLoaded || !extractionSessionId) return
    let cancelled = false
    getAdkSession(connectionId, AGENT, extractionSessionId)
      .then((detail) => {
        if (cancelled) return
        const earlier = chatTurnsAfterExtraction(detail.turns)
        setTurns((current) => (current.length ? current : earlier))
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setHistoryLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [open, historyLoaded, extractionSessionId, connectionId])

  const ensureSession = async (): Promise<string> => {
    if (sessionId) return sessionId
    const session = await createAdkSession(connectionId, AGENT)
    setSessionId(session.sessionId)
    return session.sessionId
  }

  const submit = async (rawText: string) => {
    const text = rawText.trim()
    if (isSending || (!text && attachments.length === 0)) return

    setIsSending(true)
    setTurns((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        text: text || `Attached ${attachments.length} file${attachments.length === 1 ? '' : 's'}.`,
      },
    ])
    const artifactIds = attachments.map((a) => a.id)
    setAttachments([])

    try {
      const activeSession = await ensureSession()
      const response = await sendAdkMessage(connectionId, AGENT, activeSession, {
        text,
        artifactIds: artifactIds.length ? artifactIds : undefined,
      })
      setTurns((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'agent',
          text: response.text || (response.interrupted ? 'Stopped.' : ''),
          toolCalls: response.toolCalls,
          interrupted: response.interrupted,
        },
      ])
    } catch {
      setTurns((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'error', text: "Couldn't reach the agent. Please try again." },
      ])
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const text = message
    setMessage('')
    void submit(text)
  }

  const handleStop = async () => {
    if (!sessionId) return
    try {
      await interruptAdkSession(connectionId, AGENT, sessionId)
    } catch {
      // The turn's own request still resolves either way; nothing more to do here.
    }
  }

  const handleFile = async (file: File | null) => {
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES) {
      notify.error('That file is too large.', 'The limit is 10 MB.')
      return
    }
    setIsAttaching(true)
    try {
      const activeSession = await ensureSession()
      const artifact = await uploadAdkArtifact(connectionId, AGENT, activeSession, file)
      setAttachments((prev) => [...prev, artifact])
    } catch (err) {
      notify.failure('attach that file', err)
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
      setUsage(await getAdkSessionUsage(connectionId, AGENT, sessionId))
    } catch (err) {
      notify.failure('load usage for this chat', err)
      setUsageOpen(false)
    } finally {
      setUsageLoading(false)
    }
  }

  return (
    <>
      {open && (
        // Clicking anywhere outside the panel closes it.
        <div
          className="fixed inset-0 z-40 bg-black/20"
          aria-hidden
          onClick={() => onOpenChange(false)}
        />
      )}
      {open && (
        <div
          role="dialog"
          aria-label="Ask about this data"
          className="fixed top-1/2 right-3 z-50 flex h-[92dvh] w-[calc(100%-1.5rem)] max-w-md -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-sidebar px-4 py-3">
            <div className="flex min-w-0 items-center gap-2 text-sidebar-foreground">
              <Sparkles className="size-4 shrink-0" />
              <span className="truncate text-sm font-semibold">Ask about this data</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label="Usage for this chat"
                disabled={!sessionId}
                onClick={() => void toggleUsage()}
                className="cursor-pointer rounded-md p-1.5 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <BarChart3 className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Close chat"
                onClick={() => onOpenChange(false)}
                className="cursor-pointer rounded-md p-1.5 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
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
                'Send a message to see usage for this chat.'
              )}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {turns.length === 0 && !isSending ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="size-5" />
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-base font-semibold text-foreground">Let's get started</span>
                  <span className="text-sm text-muted-foreground">
                    Ask a question about this data, or attach a file for context.
                  </span>
                </div>
                <div className="flex w-full flex-col gap-2">
                  {SUGGESTIONS.map((suggestion) => (
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
                  <button
                    type="button"
                    aria-label={`Remove ${artifact.filename}`}
                    onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== artifact.id))}
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <form className={cn('flex shrink-0 items-center gap-1.5 p-3', attachments.length === 0 && 'border-t bg-card')} onSubmit={handleSubmit}>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0 cursor-pointer rounded-full"
              aria-label="Attach a file"
              disabled={isAttaching}
              onClick={() => fileInputRef.current?.click()}
            >
              {isAttaching ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                void handleFile(event.target.files?.[0] ?? null)
                event.target.value = ''
              }}
            />
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask about this data…"
              className="h-9 flex-1 rounded-full px-3"
            />
            {isSending ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-9 shrink-0 cursor-pointer rounded-full"
                aria-label="Stop"
                onClick={() => void handleStop()}
              >
                <Square className="size-3.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                className="size-9 shrink-0 cursor-pointer rounded-full"
                aria-label="Send"
                disabled={!message.trim() && attachments.length === 0}
              >
                <ArrowUp className="size-4" />
              </Button>
            )}
          </form>
        </div>
      )}
    </>
  )
}

function TurnBubble({ turn }: { turn: Turn }) {
  if (turn.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl bg-primary px-3 py-1.5 text-sm whitespace-pre-wrap text-primary-foreground">
          {turn.text}
        </p>
      </div>
    )
  }

  if (turn.role === 'error') {
    return (
      <div className="flex justify-start">
        <p className="max-w-[85%] rounded-2xl bg-destructive/10 px-3 py-1.5 text-sm text-destructive">{turn.text}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="max-w-[90%] rounded-2xl bg-muted px-3 py-1.5 text-sm text-foreground">
        <MarkdownText text={turn.text} />
      </div>
      {turn.toolCalls.length > 0 && (
        <span className="px-1 text-[11px] text-muted-foreground">Used: {turn.toolCalls.join(', ')}</span>
      )}
      {turn.interrupted && <span className="px-1 text-[11px] text-muted-foreground">Stopped early.</span>}
    </div>
  )
}
