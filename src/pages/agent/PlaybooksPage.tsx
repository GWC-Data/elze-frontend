import * as React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { BookOpen, Loader2, Pencil, Sparkles, UploadCloud } from "lucide-react"

import { usePaths } from "@/hooks/usePaths"
import { useAsync } from "@/hooks/useAsync"
import { useAuth } from "@/context/authContext"
import { Badge } from "@/components/ui/workbench/badge"
import { Button } from "@/components/ui/workbench/button"
import { Skeleton } from "@/components/ui/workbench/skeleton"
import { ConnectionPicker } from "@/components/common/agent/ConnectionPicker"
import {
  createAdkSession,
  createPlaybookBuilderSession,
  listAdkPlaybooks,
} from "@/api/adk.api"
import type { AdkPlaybookSummary } from "@/types/adk"

const DATA_ANALYST = "data_analyst" as const

// Publishing only ever happens conversationally (the playbook_builder agent
// calls its own publish_playbook tool mid-chat) — there is no REST publish or
// delete call. After sending a publish request we poll the read-only list for
// a few seconds and toast once the draft flips to published.
async function pollForPublished(connectionId: string, playbookId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 8; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    try {
      const published = await listAdkPlaybooks(connectionId, "published")
      if (published.some((p) => p.playbookId === playbookId)) return true
    } catch {
      // Keep polling; a transient failure here shouldn't stop the attempt.
    }
  }
  return false
}

export default function PlaybooksPage() {
  const { connectionId } = useParams<{ connectionId?: string }>()
  const navigate = useNavigate()
  const paths = usePaths()

  if (!connectionId) {
    return <ConnectionPicker onSelect={(id) => navigate(paths.playbooks(id))} />
  }

  return <PlaybooksList connectionId={connectionId} />
}

function PlaybooksList({ connectionId }: { connectionId: string }) {
  const navigate = useNavigate()
  const paths = usePaths()
  const playbooksQuery = useAsync(() => listAdkPlaybooks(connectionId), [connectionId])
  // Each action is its own permission (backend constants/permissions.ts); the agent gate
  // refuses the same calls server-side, these only keep the buttons honest. Editing and
  // publishing a draft both change an existing playbook, so both are playbook.update.
  const { can } = useAuth()
  const canCreate = can("playbook.create")
  const canUpdate = can("playbook.update")
  const canRun = can("playbook.run")
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [publishingId, setPublishingId] = React.useState<string | null>(null)
  const [isStartingBuilder, setIsStartingBuilder] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const playbooks = playbooksQuery.data ?? []

  const handleBuildNew = async () => {
    if (isStartingBuilder) return
    setActionError(null)
    setIsStartingBuilder(true)
    try {
      const session = await createPlaybookBuilderSession(connectionId)
      navigate(paths.playbookBuilder(connectionId, session.sessionId))
    } catch {
      setActionError("Couldn't start the Playbook Builder. Please try again.")
      setIsStartingBuilder(false)
    }
  }

  const handleAnalyse = async (playbook: AdkPlaybookSummary) => {
    if (busyId) return
    setActionError(null)
    setBusyId(playbook.playbookId)
    try {
      const session = await createAdkSession(connectionId, DATA_ANALYST, { playbook_id: playbook.playbookId })
      navigate(paths.dataAnalyst(connectionId, session.sessionId))
    } catch {
      setActionError(`Couldn't start a chat from "${playbook.name}". Please try again.`)
      setBusyId(null)
    }
  }

  const handleEdit = async (playbook: AdkPlaybookSummary) => {
    if (busyId) return
    setActionError(null)
    setBusyId(playbook.playbookId)
    try {
      const session = await createPlaybookBuilderSession(connectionId, undefined, true)
      navigate(paths.playbookBuilder(connectionId, session.sessionId), {
        state: {
          autoSendMessage: `I want to keep working on the draft playbook "${playbook.name}" (id: ${playbook.playbookId}).`,
        },
      })
    } catch {
      setActionError(`Couldn't start an edit session for "${playbook.name}". Please try again.`)
      setBusyId(null)
    }
  }

  const handlePublish = async (playbook: AdkPlaybookSummary) => {
    if (busyId) return
    setActionError(null)
    setBusyId(playbook.playbookId)
    setPublishingId(playbook.playbookId)
    try {
      const session = await createPlaybookBuilderSession(connectionId, undefined, true)
      navigate(paths.playbookBuilder(connectionId, session.sessionId), {
        state: {
          autoSendMessage: `I'd like to publish the draft playbook "${playbook.name}" (id: ${playbook.playbookId}) as-is.`,
        },
      })
      const published = await pollForPublished(connectionId, playbook.playbookId)
      if (published) {
        toast.success(`"${playbook.name}" is now published.`)
        playbooksQuery.reload()
      }
    } catch {
      setActionError(`Couldn't start a publish request for "${playbook.name}". Please try again.`)
    } finally {
      setBusyId(null)
      setPublishingId(null)
    }
  }

  return (
    <div className="agent-workbench flex flex-col gap-4 p-6 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-foreground">Playbooks</h1>
          <p className="text-muted-foreground">
            Dataset context available to the agent. Open one to start a chat seeded with an analysis of that dataset.
          </p>
        </div>
        {canCreate ? (
          <Button type="button" size="sm" className="cursor-pointer gap-1.5" onClick={handleBuildNew} disabled={isStartingBuilder}>
            {isStartingBuilder ? <Loader2 className="size-3.5 shrink-0 animate-spin" /> : <Sparkles className="size-3.5 shrink-0" />}
            Build with agent
          </Button>
        ) : null}
      </div>

      {actionError && <p className="text-xs text-destructive">{actionError}</p>}

      {(playbooksQuery.loading) && (
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

      {Boolean(playbooksQuery.error) && (
        <p className="text-xs text-destructive">Couldn&apos;t load playbooks. Please try again.</p>
      )}

      {!playbooksQuery.loading && !playbooksQuery.error && playbooks.length === 0 && (
        <p className="text-xs text-muted-foreground">No playbooks yet.</p>
      )}

      {!playbooksQuery.loading && playbooks.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {playbooks.map((playbook) => {
            const isBusy = busyId === playbook.playbookId
            const isPublishing = publishingId === playbook.playbookId
            const isPublished = playbook.playbookStatus === "published"
            const disabled = busyId !== null && !isBusy

            return (
              <div
                key={playbook.playbookId}
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

                <div className="mt-1 flex items-center gap-2">
                  {isPublished ? (
                    canRun && <Button
                      type="button"
                      size="sm"
                      className="cursor-pointer gap-1.5"
                      disabled={disabled}
                      onClick={() => void handleAnalyse(playbook)}
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
                        onClick={() => void handleEdit(playbook)}
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
                        onClick={() => void handlePublish(playbook)}
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
