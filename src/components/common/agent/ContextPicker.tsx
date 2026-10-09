import * as React from "react"
import { ChevronDown, Layers, Loader2 } from "lucide-react"

import { errorMessage, isForbidden } from "@/api/client"
import { useAsync } from "@/hooks/useAsync"
import { listPublishedContexts } from "@/api/connection.api"
import type { PublishedContextOption } from "@/types/metadataLakehouse"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/workbench/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/workbench/dropdown-menu"
import { Hint } from "@/components/common/Hint"

export type { PublishedContextOption }

const NONE = "__none__"

const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })

export function ContextPicker({
  value,
  onChange,
  disabled,
  disabledHint,
}: {
  value: PublishedContextOption | null
  onChange: (next: PublishedContextOption | null) => void
  disabled?: boolean
  disabledHint?: string
}) {
  const { data, error, loading, reload } = useAsync(listPublishedContexts)
  const items = React.useMemo(() => data ?? [], [data])

  const groups = React.useMemo(() => {
    const map = new Map<string, PublishedContextOption[]>()
    for (const item of items) {
      const key = `${item.connectionId}\u0000${item.name}`
      map.set(key, [...(map.get(key) ?? []), item])
    }
    return [...map.values()]
  }, [items])

  const latest = React.useRef({ value, onChange })
  React.useEffect(() => {
    latest.current = { value, onChange }
  })
  React.useEffect(() => {
    if (!data) return
    const { value: selected, onChange: change } = latest.current
    if (!selected) return
    const current = data.find((item) => item.id === selected.id)
    if (!current) change(null)
    else if (current.live !== selected.live || current.name !== selected.name) change(current)
  }, [data])

  const errorText = error
    ? isForbidden(error)
      ? "You don't have permission to view contexts. Ask an administrator for access."
      : errorMessage(error, "Could not load published contexts.")
    : null

  const shown = value ? `${value.name} · ${value.label}` : "Context"

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && error) reload()
      }}
    >
      <Hint
        label={
          disabled && disabledHint
            ? disabledHint
            : value
              ? `${value.name} ${value.label}${value.live ? " (live)" : ""}`
              : "Choose a published context"
        }
      >
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              aria-label={value ? `Context: ${value.name} ${value.label}` : "Choose a context"}
              className={cn(
                "h-10 max-w-[16rem] shrink-0 cursor-pointer gap-1.5 rounded-full px-3",
                value && "border-link/40 text-link"
              )}
            >
              <Layers className="size-4 shrink-0" />
              <span className="truncate text-sm">{shown}</span>
              <ChevronDown className="size-3.5 shrink-0 opacity-70" />
            </Button>
          }
        />
      </Hint>
      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        className="max-h-[60vh] w-80 max-w-[90vw] overflow-y-auto"
      >
        <DropdownMenuRadioGroup
          value={value?.id ?? NONE}
          onValueChange={(next: string) => {
            onChange(next === NONE ? null : items.find((item) => item.id === next) ?? null)
          }}
        >
          <DropdownMenuLabel>Published contexts</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {errorText ? (
            <p className="px-2 py-3 text-sm whitespace-normal text-destructive">{errorText}</p>
          ) : loading ? (
            <p className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading contexts…
            </p>
          ) : (
            <>
              <DropdownMenuRadioItem value={NONE} closeOnClick>
                <span className="text-muted-foreground">No context</span>
              </DropdownMenuRadioItem>
              {groups.length === 0 ? (
                <p className="px-2 py-3 text-sm whitespace-normal text-muted-foreground">
                  Nothing published yet. Publish a context from the Metadata Lakehouse and it appears here.
                </p>
              ) : (
                groups.map((versions) => {
                  const head = versions[0]
                  return (
                    <React.Fragment key={`${head.connectionId}:${head.name}`}>
                      <DropdownMenuSeparator />
                      <p className="px-2 pt-1.5 pb-1 text-xs font-semibold">
                        {head.name}
                        {head.connectionName !== head.name ? (
                          <span className="font-normal text-muted-foreground"> · {head.connectionName}</span>
                        ) : null}
                      </p>
                      {versions.map((item) => (
                        <DropdownMenuRadioItem key={item.id} value={item.id} closeOnClick>
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="font-mono text-xs font-semibold">{item.label}</span>
                            {item.live ? (
                              <span className="text-[10px] font-semibold text-primary">
                                Live
                              </span>
                            ) : (
                              <span className="text-[10px] italic text-muted-foreground">older</span>
                            )}
                            <span className="ml-auto text-xs text-muted-foreground">
                              {date.format(new Date(item.publishedAt))}
                            </span>
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                    </React.Fragment>
                  )
                })
              )}
            </>
          )}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
