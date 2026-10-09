import { useState } from 'react'
import { Hint } from '@/components/common/Hint'
import { cn } from '@/lib/utils'

const POINT_BREAK = /(?<=[.!?])\s+(?=["'“(A-Z0-9])|\s+[—–]\s+/

function pointsOf(text: string): string[] {
  return text
    .split(POINT_BREAK)
    .map((point) => point.trim())
    .filter(Boolean)
    .map((point) => point.charAt(0).toUpperCase() + point.slice(1))
}

const UUID_SPLIT = /([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})/i

export function ShortIds({ text }: { text: string }) {
  const parts = text.split(UUID_SPLIT)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Hint key={i} label={part}>
            <span className="font-mono text-[0.9em] text-muted-foreground">{part.slice(0, 8)}…</span>
          </Hint>
        ) : (
          part
        )
      )}
    </>
  )
}

export function ReadableText({
  text,
  limit = 3,
  className,
}: {
  text: string
  limit?: number
  className?: string
}) {
  const [all, setAll] = useState(false)
  const points = pointsOf(text)

  if (points.length <= 1) {
    return (
      <p className={cn('max-w-[90ch] text-sm leading-6 text-foreground/85', className)}>
        <ShortIds text={text} />
      </p>
    )
  }

  const shown = all ? points : points.slice(0, limit)
  const hidden = points.length - shown.length
  return (
    <div className={cn('max-w-[90ch] text-sm leading-6 text-foreground/85', className)}>
      <ul className="list-disc space-y-1 pl-5 marker:text-primary/60">
        {shown.map((point, i) => (
          <li key={i}>
            <ShortIds text={point} />
          </li>
        ))}
      </ul>
      {points.length > limit ? (
        <button
          type="button"
          onClick={() => setAll(!all)}
          className="mt-1 cursor-pointer text-xs font-medium text-primary hover:underline"
        >
          {all ? 'Show less' : `Show ${hidden} more`}
        </button>
      ) : null}
    </div>
  )
}
