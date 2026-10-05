import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { notify } from '@/lib/notify'
import { useDecideReviewItem, useUpdateReviewItem } from '@/hooks/useMetadataLakehouse'
import { isAiText, labelFor } from '@/lib/factFields'
import { FieldValue } from '@/components/common/metadata-lakehouse/steps/FieldDisplay'

export interface EditableFact {
  id: string
  objectType: string
  qualifiedName: string
  payload: Record<string, unknown>
}

export function FactEditSheet({
  connectionId,
  fact,
  onClose,
  approvable = false,
}: {
  connectionId: string
  fact: EditableFact | null
  onClose: () => void
  approvable?: boolean
}) {
  return (
    <Sheet modal={false} open={Boolean(fact)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        showOverlay={false}
        onInteractOutside={(event) => event.preventDefault()}
        className="w-full overflow-y-auto shadow-2xl sm:max-w-xl"
      >
        {fact ? (
          <EditForm
            key={fact.id}
            connectionId={connectionId}
            fact={fact}
            onClose={onClose}
            approvable={approvable}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

type Draft = Record<string, string>

function EditForm({
  connectionId,
  fact,
  onClose,
  approvable,
}: {
  connectionId: string
  fact: EditableFact
  onClose: () => void
  approvable: boolean
}) {
  const update = useUpdateReviewItem(connectionId)
  const decide = useDecideReviewItem(connectionId)
  const payload = fact.payload

  const editableKeys = [
    'description',
    ...Object.keys(payload).filter((k) => k !== 'description' && isAiText(k)),
  ]
  const readOnly = Object.entries(payload).filter(([k]) => !editableKeys.includes(k))

  const initial: Draft = Object.fromEntries(
    editableKeys.map((k) => [k, payload[k] === null || payload[k] === undefined ? '' : String(payload[k])])
  )
  const [draft, setDraft] = useState<Draft>(initial)
  const changed = editableKeys.filter((k) => draft[k] !== initial[k])

  const busy = update.isPending || decide.isPending

  const save = async (approve: boolean) => {
    const fields = Object.fromEntries(changed.map((key) => [key, draft[key]]))
    try {
      if (changed.length > 0) {
        await update.mutateAsync({ id: fact.id, body: { fields }, approve })
      } else if (approve) {
        await decide.mutateAsync({ id: fact.id, decision: 'approve' })
      }
      notify.success(
        approve
          ? changed.length > 0
            ? 'Saved and approved.'
            : 'Approved.'
          : 'Saved. Marked as a human override.'
      )
      onClose()
    } catch (err) {
      notify.failure(`save “${fact.qualifiedName}”`, err)
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <span>Edit generated details</span>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {fact.objectType}
          </Badge>
        </SheetTitle>
        <SheetDescription>
          Edit the text the AI generated. Names and values read from the source stay as they are.
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-5 px-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <div className="rounded-md border bg-muted/50 px-3 py-2">
            <span className="min-w-0 break-all font-mono text-xs">{fact.qualifiedName}</span>
          </div>
          <p className="text-xs text-muted-foreground">Names can’t be edited.</p>
        </div>

        {editableKeys.map((key) => {
          const value = draft[key] ?? ''
          const long = key === 'description' || key === 'note' || value.length > 60 || value.includes('\n')
          const id = `fact-${key}`
          return (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={id} className="flex items-baseline gap-1.5">
                {labelFor(key)}
                <span className="text-[10px] font-normal italic text-muted-foreground">AI generated</span>
              </Label>
              {long ? (
                <Textarea
                  id={id}
                  rows={key === 'description' ? 6 : 3}
                  value={value}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                />
              ) : (
                <Input
                  id={id}
                  value={value}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                />
              )}
            </div>
          )
        })}

        {readOnly.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-dashed p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Read-only — names, source values and structure
            </p>
            <dl className="grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)]">
              {readOnly.map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-muted-foreground">{labelFor(key)}</dt>
                  <dd className="min-w-0">
                    <FieldValue value={value} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>

      <SheetFooter className="flex-row justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant={approvable ? 'outline' : 'default'}
          onClick={() => save(false)}
          disabled={changed.length === 0 || busy}
        >
          {busy && !approvable ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Save changes
        </Button>
        {approvable ? (
          <Button size="sm" onClick={() => save(true)} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
            {changed.length > 0 ? 'Save and approve' : 'Approve'}
          </Button>
        ) : null}
      </SheetFooter>
    </>
  )
}
