import * as React from "react"
import { CheckCircle2, ExternalLink, FlaskConical, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/workbench/button"
import type { FieldPair, FinalBlock } from "@/types/playbookStage"

function findStat(
  stats: FieldPair[] | undefined,
  labelPattern: RegExp
): string | null {
  const stat = stats?.find((entry) => labelPattern.test(entry.label))
  return stat?.value.trim() || null
}

export function FinalBlockView({
  block,
  onGoToSandbox,
  onGoToPlaybooks,
  onTestPlaybook,
}: {
  block: FinalBlock
  onGoToSandbox?: () => void
  onGoToPlaybooks?: () => void
  onTestPlaybook?: (playbookId: string) => void | Promise<void>
}) {
  const [testing, setTesting] = React.useState(false)
  const savedFileName = findStat(block.stats, /saved file/i)
  const updatedPlaybookId = findStat(block.stats, /updated playbook/i)
  const testTargetId = savedFileName ?? updatedPlaybookId

  const handleTestPlaybook = async () => {
    if (!testTargetId || !onTestPlaybook || testing) return
    setTesting(true)
    try {
      await onTestPlaybook(testTargetId)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-lg p-3 shadow-sm"
      style={{
        backgroundImage:
          "linear-gradient(180deg, color-mix(in oklab, #009300 10%, var(--card)) 0%, var(--card) 100%)",
      }}
    >
      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-4" />
        <span className="text-sm font-semibold">{block.title}</span>
      </div>
      <p className="text-sm text-card-foreground">{block.display_value}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        {updatedPlaybookId ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="cursor-pointer"
            disabled={!onGoToPlaybooks}
            onClick={() => onGoToPlaybooks?.()}
          >
            <ExternalLink />
            View in Playbooks
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="cursor-pointer"
            disabled={!onGoToSandbox}
            onClick={() => onGoToSandbox?.()}
          >
            <ExternalLink />
            View in Sandbox
          </Button>
        )}
        {testTargetId && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="cursor-pointer"
            disabled={!onTestPlaybook || testing}
            onClick={handleTestPlaybook}
          >
            {testing ? <Loader2 className="animate-spin" /> : <FlaskConical />}
            {testing ? "Starting…" : "Test Playbook"}
          </Button>
        )}
      </div>
    </div>
  )
}
