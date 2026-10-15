import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
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
import { AiBadge, Eyebrow } from '@/components/common/metadata-lakehouse/primitives'

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
        className="w-full gap-0 border-l bg-card shadow-2xl data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
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

function objectTypeLabel(objectType: string) {
  return objectType.replace(/[_-]+/g, ' ').trim()
}

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
      <SheetHeader className="gap-1.5 border-b px-6 pt-6 pb-5 pr-14">
        <Eyebrow>Edit · {objectTypeLabel(fact.objectType)}</Eyebrow>
        <SheetTitle className="font-serif text-2xl font-semibold leading-tight tracking-tight break-all">
          {fact.qualifiedName}
        </SheetTitle>
        <SheetDescription>
          Edit the text the AI generated. Names and source values stay as they are.
        </SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
        {editableKeys.map((key) => {
          const value = draft[key] ?? ''
          const long = key === 'description' || key === 'note' || value.length > 60 || value.includes('\n')
          const id = `fact-${key}`
          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={id} className="text-sm font-semibold">
                  {labelFor(key)}
                </Label>
                <AiBadge label="AI generated" />
              </div>
              {long ? (
                <Textarea
                  id={id}
                  value={value}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                  className={
                    key === 'description'
                      ? 'max-h-96 min-h-32 bg-background leading-relaxed'
                      : 'max-h-64 min-h-20 bg-background leading-relaxed'
                  }
                />
              ) : (
                <Input
                  id={id}
                  value={value}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                  className="h-10 bg-background"
                />
              )}
            </div>
          )
        })}

        {readOnly.length > 0 ? (
          <section className="space-y-3 rounded-xl border bg-muted/30 p-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">From the source</h3>
              <p className="text-xs text-muted-foreground">Read from the data source, so they can’t be edited here.</p>
            </div>
            <dl className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)]">
              {readOnly.map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-muted-foreground">{labelFor(key)}</dt>
                  <dd className="min-w-0">
                    <FieldValue value={value} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </div>

      <SheetFooter className="mt-0 flex-row items-center justify-end gap-2 border-t bg-card px-6 py-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={approvable ? 'outline' : 'default'}
          onClick={() => save(false)}
          disabled={changed.length === 0 || busy}
        >
          {busy && !approvable ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Save changes
        </Button>
        {approvable ? (
          <Button onClick={() => save(true)} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
            {changed.length > 0 ? 'Save and approve' : 'Approve'}
          </Button>
        ) : null}
      </SheetFooter>
    </>
  )
}
