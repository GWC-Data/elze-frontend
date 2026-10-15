import * as React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { BookOpen, ChevronDown, Database, Filter, Loader2, Pencil, Sparkles, UploadCloud } from "lucide-react"

import { usePaths } from "@/hooks/usePaths"
import { hasPublishedContext, rememberConnection, useAcrossConnections } from "@/hooks/useAcrossConnections"
import type { ConnectionItem } from "@/hooks/useAcrossConnections"
import { useAuth } from "@/context/authContext"
import { ContextQueryProvider } from "@/context/QueryProvider"
import { Badge } from "@/components/ui/workbench/badge"
import { Button } from "@/components/ui/workbench/button"
import { Skeleton } from "@/components/ui/workbench/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/workbench/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ErrorState } from "@/components/common/States"
import {
  createDataAnalystSession,
  createPlaybookBuilderSession,
  listAdkPlaybooks,
} from "@/api/adk.api"
import type { AdkPlaybookSummary } from "@/types/adk"
import type { Connection } from "@/types/metadataLakehouse"

type PlaybookEntry = ConnectionItem<AdkPlaybookSummary>

const ALL = "__all__"

async function pollForPublished(connectionId: string, playbookId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 8; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    const published = await listAdkPlaybooks(connectionId, "published").catch((): AdkPlaybookSummary[] => [])
    if (published.some((p) => p.playbookId === playbookId)) return true
  }
  return false
}

export default function PlaybooksPage() {
  return (
    <ContextQueryProvider>
      <PlaybooksList />
    </ContextQueryProvider>
  )
}

function PlaybooksList() {
  const { connectionId: filterId } = useParams<{ connectionId?: string }>()
  const navigate = useNavigate()
  const paths = usePaths()
  const all = useAcrossConnections((id) => listAdkPlaybooks(id), "playbooks", hasPublishedContext)
  const { can } = useAuth()
  const canCreate = can("playbook.create")
  const canUpdate = can("playbook.update")
  const canRun = can("playbook.run")
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [publishingId, setPublishingId] = React.useState<string | null>(null)
  const [isStartingBuilder, setIsStartingBuilder] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const connections = all.connections ?? []
  const usable = connections.filter((c) => c.status === "connected")
  const several = connections.length > 1
  const filter = connections.find((c) => c.id === filterId) ?? null
  const entries: PlaybookEntry[] = (all.items ?? [])
    .filter((entry) => !filter || entry.connection.id === filter.id)
    .sort((a, b) => String(b.item.updatedAt).localeCompare(String(a.item.updatedAt)))
  const failed = all.failed.filter((c) => !filter || c.id === filter.id)
  const loading = all.items === null && !all.error

  const handleBuildNew = async (connectionId: string) => {
    if (isStartingBuilder) return
    setActionError(null)
    setIsStartingBuilder(true)
    try {
      rememberConnection(connectionId)
      const session = await createPlaybookBuilderSession(connectionId)
      navigate(paths.playbookBuilder(connectionId, session.sessionId))
    } catch {
      setActionError("Couldn't start the Playbook Builder. Please try again.")
      setIsStartingBuilder(false)
    }
  }

  const handleAnalyse = async ({ connection, item: playbook }: PlaybookEntry) => {
    if (busyId) return
    setActionError(null)
    setBusyId(playbook.playbookId)
    try {
      const session = await createDataAnalystSession(connection.id, { playbookId: playbook.playbookId })
      navigate(paths.dataAnalyst(connection.id, session.sessionId))
    } catch {
      setActionError(`Couldn't start a chat from "${playbook.name}". Please try again.`)
      setBusyId(null)
    }
  }

  const handleEdit = async ({ connection, item: playbook }: PlaybookEntry) => {
    if (busyId) return
    setActionError(null)
    setBusyId(playbook.playbookId)
    try {
      const session = await createPlaybookBuilderSession(connection.id, undefined, true)
      navigate(paths.playbookBuilder(connection.id, session.sessionId), {
        state: {
          autoSendMessage: `I want to keep working on the draft playbook "${playbook.name}" (id: ${playbook.playbookId}).`,
        },
      })
    } catch {
      setActionError(`Couldn't start an edit session for "${playbook.name}". Please try again.`)
      setBusyId(null)
    }
  }

  const handlePublish = async ({ connection, item: playbook }: PlaybookEntry) => {
    if (busyId) return
    setActionError(null)
    setBusyId(playbook.playbookId)
    setPublishingId(playbook.playbookId)
    try {
      const session = await createPlaybookBuilderSession(connection.id, undefined, true)
      navigate(paths.playbookBuilder(connection.id, session.sessionId), {
        state: {
          autoSendMessage: `I'd like to publish the draft playbook "${playbook.name}" (id: ${playbook.playbookId}) as-is.`,
        },
      })
      const published = await pollForPublished(connection.id, playbook.playbookId)
      if (published) {
        toast.success(`"${playbook.name}" is now published.`)
        all.reload()
      }
    } catch {
      setActionError(`Couldn't start a publish request for "${playbook.name}". Please try again.`)
    } finally {
      setBusyId(null)
      setPublishingId(null)
    }
  }

  const buildIcon = isStartingBuilder ? (
    <Loader2 className="size-3.5 shrink-0 animate-spin" />
  ) : (
    <Sparkles className="size-3.5 shrink-0" />
  )

  return (
    <div className="agent-workbench flex flex-col gap-4 p-6 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-foreground">Playbooks</h1>
          <p className="text-muted-foreground">
            Every playbook from the published contexts you can open. Open one to start a chat seeded with an analysis of that dataset.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {several ? (
            <ConnectionFilter
              connections={connections}
              value={filter?.id ?? null}
              onChange={(id) => navigate(paths.playbooks(id ?? undefined))}
            />
          ) : null}
          {canCreate && usable.length > 1 && !filter ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" size="sm" className="cursor-pointer gap-1.5" disabled={isStartingBuilder}>
                    {buildIcon}
                    Build with agent
                    <ChevronDown className="size-3.5 shrink-0 opacity-70" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Build a playbook for a published context</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {usable.map((connection) => (
                    <DropdownMenuItem key={connection.id} onClick={() => void handleBuildNew(connection.id)}>
                      <Database className="size-3.5 shrink-0" />
                      <span className="truncate">{publishedLabel(connection)}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : canCreate ? (
            <Button
              type="button"
              size="sm"
              className="cursor-pointer gap-1.5"
              onClick={() => {
                const target = filter && filter.status === "connected" ? filter : usable[0]
                if (target) void handleBuildNew(target.id)
              }}
              disabled={isStartingBuilder || usable.length === 0 || (filter !== null && filter.status !== "connected")}
            >
              {buildIcon}
              Build with agent
            </Button>
          ) : null}
        </div>
      </div>

      {actionError && <p className="text-xs text-destructive">{actionError}</p>}

      {all.error && !all.connections ? (
        <ErrorState error={all.error} title="Unable to load connections" onRetry={all.reload} compact />
      ) : null}

      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ))}
        </div>
      )}

      {failed.length > 0 && (
        <p className="text-xs text-destructive">
          Couldn&apos;t load playbooks from {failed.map(publishedLabel).join(", ")}. Please try again.
        </p>
      )}

      {all.connections && connections.length === 0 && (
        <p className="text-xs text-muted-foreground">No published contexts yet. Publish a context in the Metadata Lakehouse first.</p>
      )}

      {!loading && connections.length > 0 && entries.length === 0 && failed.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {filter ? `No playbooks for ${publishedLabel(filter)} yet.` : "No playbooks yet."}
        </p>
      )}

      {!loading && entries.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => {
            const { connection, item: playbook } = entry
            const isBusy = busyId === playbook.playbookId
            const isPublishing = publishingId === playbook.playbookId
            const isPublished = playbook.playbookStatus === "published"
            const disabled = busyId !== null && !isBusy

            return (
              <div
                key={`${connection.id}:${playbook.playbookId}`}
                className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-left shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-semibold text-card-foreground">{playbook.name}</span>
                  </div>
                  <Badge variant={isPublished ? undefined : "outline"} className="shrink-0">
                    {isPublished ? "Published" : "Draft"} · v{playbook.version}
                  </Badge>
                </div>

                {several ? (
                  <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <Database className="size-3.5 shrink-0" />
                    <span className="truncate">{publishedLabel(connection)}</span>
                  </p>
                ) : null}

                <div className="mt-1 flex items-center gap-2">
                  {isPublished ? (
                    canRun && <Button
                      type="button"
                      size="sm"
                      className="cursor-pointer gap-1.5"
                      disabled={disabled}
                      onClick={() => void handleAnalyse(entry)}
                    >
                      {isBusy ? <Loader2 className="size-3.5 shrink-0 animate-spin" /> : <Sparkles className="size-3.5 shrink-0" />}
                      Analyse
                    </Button>
                  ) : canUpdate ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="cursor-pointer gap-1.5"
                        disabled={disabled}
                        onClick={() => void handleEdit(entry)}
                      >
                        {isBusy && !isPublishing ? (
                          <Loader2 className="size-3.5 shrink-0 animate-spin" />
                        ) : (
                          <Pencil className="size-3.5 shrink-0" />
                        )}
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="cursor-pointer gap-1.5"
                        disabled={disabled}
                        onClick={() => void handlePublish(entry)}
                      >
                        {isPublishing ? (
                          <Loader2 className="size-3.5 shrink-0 animate-spin" />
                        ) : (
                          <UploadCloud className="size-3.5 shrink-0" />
                        )}
                        Publish
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function publishedLabel(connection: Connection): string {
  const published = connection.published
  return published ? `${published.name || connection.name} · ${published.label}` : connection.name
}

function ConnectionFilter({
  connections,
  value,
  onChange,
}: {
  connections: Connection[]
  value: string | null
  onChange: (connectionId: string | null) => void
}) {
  const known = value !== null && connections.some((c) => c.id === value)
  return (
    <Select value={known ? value : ALL} onValueChange={(next) => onChange(next === ALL ? null : next)}>
      <SelectTrigger size="sm" className="max-w-[16rem] min-w-48" aria-label="Filter by published context">
        <Filter className="size-3.5 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All published contexts</SelectItem>
        <SelectSeparator />
        {connections.map((connection) => (
          <SelectItem key={connection.id} value={connection.id}>
            {publishedLabel(connection)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
