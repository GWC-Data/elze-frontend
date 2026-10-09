import * as React from "react"
import { Layers, Loader2 } from "lucide-react"

import { errorMessage, isForbidden } from "@/api/client"
import { listPublishedContexts } from "@/api/connection.api"
import { useAsync } from "@/hooks/useAsync"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import type { AgentKnowledgeRef } from "@/types/agentLibrary"
import type { PublishedContextOption } from "@/types/metadataLakehouse"

const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })

function toRef(option: PublishedContextOption): AgentKnowledgeRef {
  return {
    contextVersionId: option.id,
    connectionId: option.connectionId,
    connectionName: option.connectionName,
    name: option.name,
    label: option.label,
    version: option.version,
  }
}

export function KnowledgePicker({
  value,
  onChange,
  disabled,
}: {
  value: AgentKnowledgeRef[]
  onChange: (next: AgentKnowledgeRef[]) => void
  disabled?: boolean
}) {
  const { data, error, loading, reload } = useAsync(listPublishedContexts)

  const groups = React.useMemo(() => {
    const map = new Map<string, PublishedContextOption[]>()
    for (const item of data ?? []) {
      const key = `${item.connectionId}\u0000${item.name}`
      map.set(key, [...(map.get(key) ?? []), item])
    }
    return [...map.values()]
  }, [data])

  const selected = React.useMemo(() => new Set(value.map((ref) => ref.contextVersionId)), [value])

  const missing = React.useMemo(() => {
    if (!data) return []
    const known = new Set(data.map((item) => item.id))
    return value.filter((ref) => !known.has(ref.contextVersionId))
  }, [data, value])

  const toggle = (option: PublishedContextOption) => {
    if (selected.has(option.id)) {
      onChange(value.filter((ref) => ref.contextVersionId !== option.id))
    } else {
      onChange([...value, toRef(option)])
    }
  }

  if (error) {
    return (
      <div className="border border-dashed p-3 text-xs">
        <p className="text-destructive">
          {isForbidden(error)
            ? "You don't have permission to view published contexts. Ask an administrator for access."
            : errorMessage(error, "Could not load published contexts.")}
        </p>
        {!isForbidden(error) && (
          <button type="button" className="mt-1 text-link underline" onClick={reload}>
            Try again
          </button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 border border-dashed p-3 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Loading published contexts…
      </p>
    )
  }

  if (groups.length === 0 && missing.length === 0) {
    return (
      <p className="border border-dashed p-3 text-xs text-muted-foreground">
        Nothing published yet. Publish a context from the Metadata Lakehouse and it appears here.
      </p>
    )
  }

  return (
    <div className="max-h-56 overflow-y-auto border">
      {groups.map((versions) => {
        const head = versions[0]
        return (
          <div key={`${head.connectionId}:${head.name}`} className="border-b last:border-b-0">
            <p className="flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 text-xs font-semibold">
              <Layers className="size-3.5 text-muted-foreground" />
              {head.name}
              {head.connectionName !== head.name && (
                <span className="font-normal text-muted-foreground">· {head.connectionName}</span>
              )}
            </p>
            {versions.map((item) => {
              const checked = selected.has(item.id)
              return (
                <label
                  key={item.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50",
                    disabled && "pointer-events-none opacity-60"
                  )}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(item)} disabled={disabled} />
                  <span className="font-mono font-semibold">{item.label}</span>
                  {item.live ? (
                    <span className="text-[10px] font-semibold text-primary">Live</span>
                  ) : (
                    <span className="text-[10px] italic text-muted-foreground">older</span>
                  )}
                  <span className="ml-auto text-muted-foreground">{date.format(new Date(item.publishedAt))}</span>
                </label>
              )
            })}
          </div>
        )
      })}
      {missing.map((ref) => (
        <label
          key={ref.contextVersionId}
          className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50"
        >
          <Checkbox
            checked
            onCheckedChange={() => onChange(value.filter((r) => r.contextVersionId !== ref.contextVersionId))}
            disabled={disabled}
          />
          <span className="font-semibold">{ref.name}</span>
          <span className="font-mono">{ref.label}</span>
          <span className="ml-auto text-destructive">no longer published</span>
        </label>
      ))}
    </div>
  )
}
