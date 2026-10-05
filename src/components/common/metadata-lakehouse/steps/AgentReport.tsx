import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

export function AgentReport({ text }: { text: string }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <header className="border-b px-8 pb-5 pt-7">
        <div className="mx-auto min-w-0 max-w-[72ch]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Agent report</p>
          <h3 className="mt-1 font-serif text-3xl font-semibold leading-tight tracking-tight">What the agent did</h3>
          <p className="mt-2 truncate text-xs text-muted-foreground">
            In its own words
          </p>
        </div>
      </header>
      <div className="max-h-[720px] overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-[72ch] font-serif text-[16px] leading-8">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN}>
          {text}
        </ReactMarkdown>
        </div>
      </div>
    </section>
  )
}

const MARKDOWN: Components = {
  h1: ({ children }) => (
    <h2 className="mb-3 mt-8 font-serif text-2xl font-semibold tracking-tight first:mt-0">{children}</h2>
  ),
  h2: ({ children }) => (
    <h3 className="mb-2 mt-8 font-serif text-xl font-semibold tracking-tight first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mb-2 mt-6 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-primary first:mt-0">
      {children}
    </h4>
  ),
  h4: ({ children }) => <h5 className="mb-1 mt-4 font-sans text-sm font-semibold first:mt-0">{children}</h5>,
  p: ({ children }) => <p className="my-3 text-foreground/85 first:mt-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-primary">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-muted-foreground">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5 text-foreground/85">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-primary/40 pl-3 italic text-muted-foreground">{children}</blockquote>
  ),
  hr: () => <hr className="my-4" />,
  code: ({ className, children }) => {
    const block = /language-/.test(className ?? '')
    return block ? (
      <code className={cn('font-mono text-xs', className)}>{children}</code>
    ) : (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">{children}</code>
    )
  },
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg bg-muted px-3 py-2.5 text-xs">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="my-5 overflow-x-auto rounded-lg border font-sans">
      <table className="w-full border-collapse text-[13px] leading-6">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
  th: ({ children }) => <th className="px-3 py-2 text-left font-semibold">{children}</th>,
  tr: ({ children }) => <tr className="border-t even:bg-muted/20">{children}</tr>,
  td: ({ children }) => <td className="px-3 py-2 align-top">{children}</td>,
}
