import { Check, Loader2, MoreHorizontal, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ACCESS_LEVEL_LABELS, ACCESS_LEVEL_ORDER } from '@/constants/labels'
import { cn } from '@/lib/utils'
import type { AccessLevel } from '@/types/auth'
import type { AccessLevelDef } from '@/types/admin'
import { Hint } from '@/components/common/Hint'

export function GrantActionsMenu({
  holderName,
  level,
  levels,
  mayChange,
  mayRemove,
  pending = false,
  allowedLevels = ACCESS_LEVEL_ORDER,
  onChangeLevel,
  onRemove,
}: {
  holderName: string
  level: AccessLevel
  levels?: AccessLevelDef[]
  mayChange: boolean
  mayRemove: boolean
  pending?: boolean
  allowedLevels?: AccessLevel[]
  onChangeLevel: (level: AccessLevel) => void
  onRemove: () => void
}) {
  if (!mayChange && !mayRemove) return null

  const describe = (id: AccessLevel) => levels?.find((l) => l.id === id)?.description

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Hint label="Access options"><Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={pending}
          aria-label={`Access options for ${holderName}`}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <MoreHorizontal className="size-4" aria-hidden />
          )}
        </Button></Hint>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        {mayChange ? (
          <>
            <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden />
              Change permission
            </DropdownMenuLabel>
            {ACCESS_LEVEL_ORDER.filter((id) => id === level || allowedLevels.includes(id)).map((id) => {
              const current = id === level
              return (
                <DropdownMenuItem
                  key={id}
                  aria-current={current ? 'true' : undefined}
                  onSelect={() => {
                    if (!current) onChangeLevel(id)
                  }}
                  className="items-start gap-2.5 py-2"
                >
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                    {current ? <Check className="size-4 text-primary" aria-hidden /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className={cn('block text-sm', current && 'font-semibold')}>
                      {ACCESS_LEVEL_LABELS[id]}
                      {current ? (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          current
                        </span>
                      ) : null}
                    </span>
                    {describe(id) ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {describe(id)}
                      </span>
                    ) : null}
                  </span>
                </DropdownMenuItem>
              )
            })}
          </>
        ) : null}

        {mayChange && mayRemove ? <DropdownMenuSeparator /> : null}

        {mayRemove ? (
          <DropdownMenuItem
            variant="destructive"
            onSelect={onRemove}
            className="gap-2.5"
          >
            <Trash2 className="size-4" aria-hidden />
            Remove access
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
