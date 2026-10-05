import { Skeleton } from "@/components/ui/workbench/skeleton"
import { parseToolEngineData, ToolEngine } from "@/components/common/agent/tools/ToolEngine"
import { parseGenericJson, GenericJsonView } from "@/components/common/agent/tools/GenericJsonView"
import type { ChatMessage } from "@/types/agent"

export type PlaybookAnalysisPanelProps = {
  playbookName: string
  message: ChatMessage | null
  loading: boolean
  isSandboxTest?: boolean
}

export function PlaybookAnalysisPanel({
  playbookName,
  message,
  loading,
  isSandboxTest,
}: PlaybookAnalysisPanelProps) {
  const toolData = message ? parseToolEngineData(message.text) : null
  const genericData =
    !toolData && message ? parseGenericJson(message.text) : null

  return (
    <div className="shrink-0 rounded-t-none rounded-b-xl bg-card p-4">
      <div className="-mx-4 -mt-4 mb-3 flex items-center gap-2 rounded-t-none bg-sidebar px-4 py-2.5">
        <span className="text-xs font-bold tracking-wide text-white uppercase">
          {isSandboxTest ? "Sandbox analysis" : "Playbook analysis"}
        </span>
        <span className="text-sm font-semibold text-white">
          {playbookName}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : toolData ? (
        <ToolEngine data={toolData} />
      ) : genericData !== null ? (
        <GenericJsonView data={genericData} />
      ) : message ? (
        <p className="text-sm whitespace-pre-wrap text-card-foreground">
          {message.text}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          The initial analysis didn&apos;t complete. Ask a question below to
          get started.
        </p>
      )}
    </div>
  )
}

