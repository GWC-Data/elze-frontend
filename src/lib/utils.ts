import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const PILL_CLASS = /^(?:[a-z0-9[\]-]+:)*(?:bg-\S+|border|border-\S+|rounded|rounded-\S+|px-\S+|py-\S+|p-\S+|shadow\S*|ring\S*|h-\S+|text-white|text-(?:primary|secondary|destructive|accent)-foreground|text-background)$/

export function textOnly(className: string | undefined): string {
  if (!className) return ''
  return className
    .split(/\s+/)
    .filter((token) => token && !PILL_CLASS.test(token))
    .join(' ')
}

