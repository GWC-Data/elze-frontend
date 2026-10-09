import { useState } from 'react'
import { Check, Copy, KeyRound, Plug, ShieldCheck, Wrench } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { MCP_CONFIG, mcpClientConfig, mcpServerName } from '@/constants/mcp'
import { formatRelativeTime } from '@/lib/format'
import type { Connection } from '@/types/metadataLakehouse'
import { Hint } from '@/components/common/Hint'

const NO_SCROLLBAR = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

export function McpDetailsDialog({
  connection,
  onOpenChange,
}: {
  connection: Connection | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={connection !== null} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl', NO_SCROLLBAR)}>
        {connection ? <DetailsBody connection={connection} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function DetailsBody({ connection }: { connection: Connection }) {
  const published = connection.published ?? null
  const serverName = mcpServerName(connection.name)
  const config = mcpClientConfig(connection.name)

  return (
    <>
      <DialogHeader className="border-b bg-muted/40 px-6 py-5 text-left">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plug className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <DialogTitle className="text-base">MCP connection</DialogTitle>
            <DialogDescription className="text-xs">
              Connect an MCP client — Claude Desktop, Claude Code, or any client that speaks
              streamable HTTP — to this published context.
            </DialogDescription>
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{connection.name}</span>
              {published ? (
                <>
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Published · {published.label}
                  </Badge>
                  {published.publishedAt ? <span>{formatRelativeTime(published.publishedAt)}</span> : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-5 px-6 py-5 text-sm">
        <section className="overflow-hidden rounded-xl border">
          <SectionTitle icon={Plug} title="Connection" />
          <dl className="divide-y">
            <Field label="Server URL" value={MCP_CONFIG.serverUrl} copy />
            <Field label="Transport" value={MCP_CONFIG.transport} />
            <Field label="Server name" value={serverName} copy />
            <Field
              label="Context ID"
              value={connection.id}
              copy
              hint="Send as context_id on every tool call."
            />
          </dl>
        </section>

        <section className="overflow-hidden rounded-xl border">
          <SectionTitle icon={ShieldCheck} title="Authentication" />
          <dl className="divide-y">
            <Field label="Header" value={MCP_CONFIG.auth.header} />
            <Field label="Value" value={MCP_CONFIG.auth.format} />
          </dl>
          <p className="flex items-start gap-2 border-t bg-amber-50/60 px-4 py-2.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <KeyRound className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {MCP_CONFIG.auth.source} The token is shared across the platform, so it is never shown
            here.
          </p>
        </section>

        <section className="overflow-hidden rounded-xl border">
          <SectionTitle icon={Wrench} title="Available tools" count={MCP_CONFIG.tools.length} />
          <ul className="divide-y">
            {MCP_CONFIG.tools.map((tool) => (
              <li key={tool.name} className="px-4 py-2.5">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium">
                  {tool.name}
                </code>
                <p className="mt-1 text-xs text-muted-foreground">{tool.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="overflow-hidden rounded-xl border">
          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2.5">
            <h3 className="text-xs font-semibold">Client configuration</h3>
            <CopyButton text={config} label="Copy configuration" withText />
          </div>
          <pre
            className={cn(
              'overflow-x-auto bg-zinc-950 px-4 py-3 font-mono text-xs leading-relaxed text-zinc-100',
              NO_SCROLLBAR
            )}
          >
            {config}
          </pre>
          <ol className="list-decimal space-y-1 border-t px-8 py-3 text-xs text-muted-foreground">
            <li>Add this entry to your MCP client’s server list.</li>
            <li>Replace the token placeholder with the token from your platform administrator.</li>
            <li>
              Pass <code className="font-mono text-foreground">"context_id": "{connection.id}"</code>{' '}
              on every tool call.
            </li>
          </ol>
        </section>
      </div>
    </>
  )
}

function SectionTitle({
  icon: Icon,
  title,
  count,
}: {
  icon: typeof Plug
  title: string
  count?: number
}) {
  return (
    <h3 className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5 text-xs font-semibold">
      <Icon className="size-3.5 text-muted-foreground" aria-hidden />
      {title}
      {count !== undefined ? (
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {count}
        </span>
      ) : null}
    </h3>
  )
}

function Field({
  label,
  value,
  hint,
  copy = false,
}: {
  label: string
  value: string
  hint?: string
  copy?: boolean
}) {
  return (
    <div className="grid grid-cols-1 gap-1 px-4 py-2.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs text-muted-foreground sm:pt-1">{label}</dt>
      <dd className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="min-w-0 flex-1 break-all rounded-md bg-muted/50 px-2 py-1 font-mono text-xs">
            {value}
          </span>
          {copy ? <CopyButton text={value} label={`Copy ${label.toLowerCase()}`} /> : null}
        </div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </dd>
    </div>
  )
}

function CopyButton({ text, label, withText = false }: { text: string; label: string; withText?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      notify.failure('copy to the clipboard', err)
    }
  }
  const Icon = copied ? Check : Copy
  return withText ? (
    <Button variant="outline" size="sm" onClick={() => void copy()} className="h-7 gap-1.5 text-xs">
      <Icon className="size-3.5" aria-hidden />
      {copied ? 'Copied' : 'Copy'}
    </Button>
  ) : (
    <Hint label={label}><Button
      variant="ghost"
      size="icon-sm"
      onClick={() => void copy()}
      aria-label={label}
      className={cn(copied && 'text-emerald-600')}
    >
      <Icon className="size-3.5" aria-hidden />
    </Button></Hint>
  )
}
