const SCOPE_LINE = /^(?:context_ids=\[|context_id="|row_ids=\[|row_id=")[^\n]*authoritative[^\n]*(?:\n|$)/

const ATTACHMENT = /\[Attached file: (.+?) \([^)\n]*\)\]\n\n/g

const KICKOFF_PROMPT = /^context_id="[^"]*"\. Start the playbook-builder conversation now\b/

export function isKickoffPrompt(raw: string): boolean {
  return KICKOFF_PROMPT.test(raw.trim())
}

export interface VisibleMessage {
  text: string
  files: string[]
}

export function visibleMessage(raw: string): VisibleMessage {
  let text = raw
  while (SCOPE_LINE.test(text)) text = text.replace(SCOPE_LINE, '')
  const start = text.indexOf('[Attached file: ')
  if (start === -1) return { text: text.trim(), files: [] }
  const files = [...text.slice(start).matchAll(ATTACHMENT)].map((match) => match[1])
  if (files.length === 0) return { text: text.trim(), files: [] }
  return { text: text.slice(0, start).trim(), files }
}

export function dayGreeting(now = new Date()): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
