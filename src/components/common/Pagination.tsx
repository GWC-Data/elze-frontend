import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Hint } from '@/components/common/Hint'

export function Pagination({
  page,
  totalPages,
  startIndex,
  endIndex,
  total,
  setPage,
  noun = 'rows',
}: {
  page: number
  totalPages: number
  startIndex: number
  endIndex: number
  total: number
  setPage: (page: number) => void
  noun?: string
}) {
  if (total === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
      <span>
        Showing <strong className="font-semibold text-foreground">{startIndex + 1}</strong>–
        <strong className="font-semibold text-foreground">{endIndex}</strong> of{' '}
        <strong className="font-semibold text-foreground">{total}</strong> {noun}
      </span>

      {totalPages > 1 ? (
        <div className="flex items-center gap-1">
          <Hint label="First page"><Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => setPage(1)}
            disabled={page <= 1}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="size-3.5" aria-hidden />
          </Button></Hint>
          <Hint label="Previous page"><Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="size-3.5" aria-hidden />
          </Button></Hint>
          <span className="px-2 font-medium tabular-nums text-foreground">
            Page {page} of {totalPages}
          </span>
          <Hint label="Next page"><Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            aria-label="Go to next page"
          >
            <ChevronRight className="size-3.5" aria-hidden />
          </Button></Hint>
          <Hint label="Last page"><Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
            aria-label="Go to last page"
          >
            <ChevronsRight className="size-3.5" aria-hidden />
          </Button></Hint>
        </div>
      ) : null}
    </div>
  )
}
