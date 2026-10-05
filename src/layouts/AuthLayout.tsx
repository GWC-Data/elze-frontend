import type { ReactNode } from 'react'
import { ElzeMark } from '@/components/common/ElzeMark'

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center overflow-y-auto bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <header className="mb-6 text-center">
          <ElzeMark className="mx-auto mb-4 size-11" title="Elze" />
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
        </header>

        <div className="rounded-xl border border-border bg-card p-6">{children}</div>

        {footer && <div className="mt-4 text-center text-xs text-muted-foreground">{footer}</div>}
      </div>
    </div>
  )
}
