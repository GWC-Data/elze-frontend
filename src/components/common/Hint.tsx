import type { ComponentProps, ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function Hint({
  label,
  children,
  side = 'top',
  ...rest
}: {
  label: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
} & Omit<ComponentProps<typeof TooltipTrigger>, 'children'>) {
  if (label === null || label === undefined || label === '') return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild {...rest}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  )
}
