import * as React from 'react'
import {
  ArrowUp,
  AtSign,
  BarChart3,
  Columns3,
  Loader2,
  Paperclip,
  Sparkles,
  Square,
  Table2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/notify'
import { errorMessage } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MarkdownText } from '@/components/common/agent/tools/MarkdownText'
import { Hint } from '@/components/common/Hint'
import { ChatBalloon } from '@/components/common/agent/ChatBalloon'
import {
  createDescriptionEditorSession,
  getAdkSessionUsage,
  interruptAdkSession,
  sendDescriptionEditorMessage,
  uploadAdkArtifact,
} from '@/api/adk.api'
import { useFactsByTable } from '@/hooks/useMetadataLakehouse'
import { columnMention, tableMention } from '@/components/common/metadata-lakehouse/steps/mentions'
import type { DatasetNames, MentionRow } from '@/components/common/metadata-lakehouse/steps/mentions'
import type { AdkArtifact, AdkSessionUsage } from '@/types/adk'

const AGENT = 'description_editor' as const
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const MAX_OPTIONS = 40

const SUGGESTIONS = [
  'Rewrite the description in plain business language.',
  'Make the description shorter and clearer.',
  'Explain what it means for a business user, with an example.',
]

type Turn =
  | { id: string; role: 'user'; text: string; rows: MentionRow[]; files: string[] }
  | { id: string; role: 'agent'; text: string; toolCalls: string[]; interrupted: boolean }
  | { id: string; role: 'error'; text: string }

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatUsage(usage: AdkSessionUsage): string {
  const entries = Object.entries(usage).filter(([key]) => !/session/i.test(key))
  if (entries.length === 0) return 'No usage reported for this session yet.'
  return entries.map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`).join(' · ')
}

function mentionTokenAt(value: string, caret: number): { start: number; query: string } | null {
  const match = /(^|\s)@([^\s@]*)$/.exec(value.slice(0, caret))
  return match ? { start: caret - match[2].length - 1, query: match[2] } : null
}

export function UnderstandChatWidget({
  connectionId,
  versionId,
  mentions,
  onAddMention,
  onRemoveMention,
  datasetNames,
  onEdited,
  className,
}: {
  connectionId: string
  versionId: string
  mentions: MentionRow[]
  onAddMention: (row: MentionRow) => void
  onRemoveMention: (id: string) => void
  datasetNames?: DatasetNames
  onEdited: () => void
  className?: string
}) {
  const [sessionId, setSessionId] = React.useState<string | undefined>(undefined)
  const [turns, setTurns] = React.useState<Turn[]>([])
  const [message, setMessage] = React.useState('')
  const [isSending, setIsSending] = React.useState(false)
  const [attachments, setAttachments] = React.useState<AdkArtifact[]>([])
  const [isAttaching, setIsAttaching] = React.useState(false)
  const [usage, setUsage] = React.useState<AdkSessionUsage | null>(null)
  const [usageOpen, setUsageOpen] = React.useState(false)
  const [usageLoading, setUsageLoading] = React.useState(false)
  const [picker, setPicker] = React.useState<{ start: number; query: string } | null>(null)
  const [activeIndex, setActiveIndex] = React.useState(0)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const optionsRef = React.useRef<HTMLDivElement>(null)

  const rows = mentions

  const pickerQuery = React.useDeferredValue(picker?.query ?? '')
  const facts = useFactsByTable(
    connectionId,
    { page: 1, pageSize: 8, ...(pickerQuery ? { search: pickerQuery } : {}) },
    picker !== null
  )
  const options = React.useMemo<MentionRow[]>(() => {
    if (!picker || !facts.data) return []
    const needle = pickerQuery.trim().toLowerCase()
    const out: MentionRow[] = []
    for (const group of facts.data.tables) {
      const table = tableMention(group.table, datasetNames)
      const tableHit =
        !needle || table.label.toLowerCase().includes(needle) || table.fullName.toLowerCase().includes(needle)
      out.push(table)
      for (const fact of group.columns) {
        const column = columnMention(fact, group.table.qualifiedName)
        if (tableHit || column.label.toLowerCase().includes(needle)) out.push(column)
      }
    }
    return out.slice(0, MAX_OPTIONS)
  }, [picker, facts.data, pickerQuery, datasetNames])

  React.useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [turns.length, isSending])

  React.useEffect(() => {
    const active = optionsRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    const box = optionsRef.current
    if (!active || !box) return
    if (active.offsetTop < box.scrollTop) box.scrollTop = active.offsetTop
    else if (active.offsetTop + active.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = active.offsetTop + active.offsetHeight - box.clientHeight
    }
  }, [activeIndex])

  const ensureSession = async (): Promise<string> => {
    if (sessionId) return sessionId
    const session = await createDescriptionEditorSession(connectionId, { versionId })
    setSessionId(session.sessionId)
    return session.sessionId
  }

  const submit = async (rawText: string): Promise<boolean> => {
    const text = rawText.trim()
    if (isSending || !text || rows.length === 0) return false

    const sentRows = rows
    const artifactIds = attachments.map((a) => a.id)
    setIsSending(true)
    setTurns((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', text, rows: sentRows, files: attachments.map((a) => a.filename) },
    ])
    setAttachments([])

    try {
      const activeSession = await ensureSession()
      const response = await sendDescriptionEditorMessage(connectionId, activeSession, {
        rowIds: sentRows.map((r) => r.id),
        text,
        artifactIds: artifactIds.length ? artifactIds : undefined,
      })
      setTurns((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'agent',
          text: response.text || (response.interrupted ? 'Stopped.' : 'Done.'),
          toolCalls: response.toolCalls,
          interrupted: response.interrupted,
        },
      ])
      onEdited()
    } catch (err) {
      setTurns((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'error',
          text: errorMessage(err, "Couldn't reach the description editor. Please try again."),
        },
      ])
    } finally {
      setIsSending(false)
    }
    return true
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const text = message
    void submit(text).then((sent) => {
      if (sent) setMessage((current) => (current === text ? '' : current))
    })
  }

  const choose = (row: MentionRow) => {
    if (picker) {
      const end = picker.start + 1 + picker.query.length
      const start = picker.start
      setMessage((current) => current.slice(0, start) + current.slice(end))
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.setSelectionRange(start, start)
      })
    }
    onAddMention(row)
    setPicker(null)
  }

  const syncPicker = (value: string, caret: number | null) => {
    const token = mentionTokenAt(value, caret ?? value.length)
    if (!token) {
      setPicker(null)
      return
    }
    if (!picker || picker.query !== token.query) setActiveIndex(0)
    setPicker(token)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!picker) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(options.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      const row = options[activeIndex]
      if (row) choose(row)
      else setPicker(null)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setPicker(null)
    }
  }

  const handleStop = async () => {
    if (!sessionId) return
    await interruptAdkSession(connectionId, AGENT, sessionId).catch(() => undefined)
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

  const applySuggestion = (suggestion: string) => {
    if (rows.length > 0) {
      void submit(suggestion)
      return
    }
    setMessage(suggestion)
    inputRef.current?.focus()
  }

  const hasContext = rows.length > 0 || attachments.length > 0
  const mentionIds = new Set(mentions.map((m) => m.id))

  return (
    <section
      aria-label="Description editor"
      className={cn('flex flex-col overflow-hidden rounded-xl border bg-background shadow-sm', className)}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-sidebar px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sidebar-foreground">
          <Sparkles className="size-4 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">Description editor</span>
            <span className="block truncate text-[11px] text-sidebar-foreground/70">
              Rewrites table and column descriptions in this draft
            </span>
          </span>
        </div>
        <Hint label="Usage for this chat">
          <button
            type="button"
            aria-label="Usage for this chat"
            disabled={!sessionId}
            onClick={() => void toggleUsage()}
            className="shrink-0 cursor-pointer rounded-md p-1.5 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <BarChart3 className="size-4" />
          </button>
        </Hint>
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

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-4">
        {turns.length === 0 && !isSending ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-4">
            <ChatBalloon className="w-24" />
            <div className="flex w-full flex-col gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => applySuggestion(suggestion)}
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
                <Loader2 className="size-3 animate-spin" /> Rewriting…
              </div>
            )}
          </div>
        )}
      </div>

      {hasContext && (
        <div className="flex max-h-28 shrink-0 flex-wrap items-center gap-1.5 overflow-y-auto border-t bg-card px-3 pt-2">
          {mentions.map((row) => (
            <Chip
              key={row.id}
              icon={<AtSign className="size-3 shrink-0" />}
              label={row.label}
              hint={row.fullName}
              onRemove={() => onRemoveMention(row.id)}
              removeLabel={`Remove ${row.label}`}
            />
          ))}
          {attachments.map((artifact) => (
            <Chip
              key={artifact.id}
              icon={<Paperclip className="size-3 shrink-0" />}
              label={artifact.filename}
              hint={artifact.filename}
              detail={formatSize(artifact.sizeBytes)}
              onRemove={() => setAttachments((prev) => prev.filter((a) => a.id !== artifact.id))}
              removeLabel={`Remove ${artifact.filename}`}
            />
          ))}
        </div>
      )}

      <form
        className={cn('relative flex shrink-0 flex-col gap-1.5 p-3', !hasContext && 'border-t bg-card')}
        onSubmit={handleSubmit}
      >
        {picker ? (
          <div
            ref={optionsRef}
            id="description-editor-mentions"
            role="listbox"
            aria-label="Tables and columns"
            className="absolute inset-x-3 bottom-full mb-1 max-h-64 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg"
          >
            {options.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                {facts.isFetching ? 'Searching…' : 'No table or column matches that.'}
              </p>
            ) : (
              options.map((row, i) => (
                <div
                  key={row.id}
                  id={`description-editor-mention-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => choose(row)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                    row.kind === 'column' && 'pl-7',
                    i === activeIndex && 'bg-accent'
                  )}
                >
                  {row.kind === 'table' ? (
                    <Table2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  ) : (
                    <Columns3 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className={cn('min-w-0 flex-1 truncate', row.kind === 'table' ? 'font-medium' : 'font-mono text-xs')}>
                    {row.label}
                  </span>
                  {mentionIds.has(row.id) ? <span className="text-[10px] text-primary">added</span> : null}
                </div>
              ))
            )}
          </div>
        ) : null}

        <div className="flex items-center gap-1.5">
          <Hint label="Attach a file">
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
          </Hint>
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
            ref={inputRef}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value)
              syncPicker(event.target.value, event.target.selectionStart)
            }}
            onClick={(event) => syncPicker(event.currentTarget.value, event.currentTarget.selectionStart)}
            onKeyDown={handleKeyDown}
            onBlur={() => setPicker(null)}
            placeholder={rows.length ? 'How should the descriptions change?' : 'Type @ to mention tables or columns…'}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={picker !== null}
            aria-controls={picker ? 'description-editor-mentions' : undefined}
            aria-activedescendant={picker && options[activeIndex] ? `description-editor-mention-${activeIndex}` : undefined}
            className="h-9 flex-1 rounded-full px-3"
          />
          {isSending ? (
            <Hint label="Stop">
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
            </Hint>
          ) : (
            <Hint label="Send">
              <Button
                type="submit"
                size="icon"
                className="size-9 shrink-0 cursor-pointer rounded-full"
                aria-label="Send"
                disabled={!message.trim() || rows.length === 0 || picker !== null}
              >
                <ArrowUp className="size-4" />
              </Button>
            </Hint>
          )}
        </div>
      </form>
    </section>
  )
}

function Chip({
  icon,
  label,
  hint,
  detail,
  onRemove,
  removeLabel,
}: {
  icon: React.ReactNode
  label: string
  hint: string
  detail?: string
  onRemove: () => void
  removeLabel: string
}) {
  return (
    <span className="flex max-w-full items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-xs text-foreground">
      {icon}
      <Hint label={hint}>
        <span className="min-w-0 max-w-44 truncate font-medium">{label}</span>
      </Hint>
      {detail ? <span className="text-muted-foreground">{detail}</span> : null}
      <Hint label={removeLabel}>
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      </Hint>
    </span>
  )
}

function TurnBubble({ turn }: { turn: Turn }) {
  if (turn.role === 'user') {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex max-w-[85%] flex-wrap justify-end gap-1">
          {turn.rows.map((row) => (
            <Hint key={row.id} label={row.fullName}>
              <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                <AtSign className="size-2.5 shrink-0" aria-hidden />
                <span className="truncate">{row.label}</span>
              </span>
            </Hint>
          ))}
          {turn.files.map((name) => (
            <span
              key={name}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              <Paperclip className="size-2.5 shrink-0" aria-hidden />
              <span className="truncate">{name}</span>
            </span>
          ))}
        </div>
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
