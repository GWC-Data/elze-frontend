import { useId } from 'react'
import { cn } from '@/lib/utils'

export function ElzeMark({ className, title }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, '')
  const fill = `elze-mark-${id}`
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('size-8 shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={fill} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4F46E5" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${fill})`} />
      <rect x="8.5" y="7.5" width="3.5" height="17" rx="1.75" fill="#fff" />
      <rect x="8.5" y="7.5" width="15" height="3.5" rx="1.75" fill="#fff" />
      <rect x="8.5" y="14.25" width="10" height="3.5" rx="1.75" fill="#fff" fillOpacity="0.85" />
      <rect x="8.5" y="21" width="15" height="3.5" rx="1.75" fill="#fff" />
      <circle cx="23" cy="16" r="2" fill="#fff" />
    </svg>
  )
}
