export type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export type Session = {
  id: string
  appName: string
  userId: string
  state: Record<string, unknown>
  lastUpdateTime: number
}

export type ChatMessage = {
  author: string
  text: string
  timestamp: number
  thoughts?: string[]
  thinkingSeconds?: number
}

export type MessageScope = 'analyst' | 'builder'

export type StreamEvent =
  | { type: 'thought'; text: string }
  | { type: 'final'; session_id: string; messages: ChatMessage[] }

export type Playbook = {
  id: string
  name: string
  description: string
  content: string
  version: number
  version_count: number
}

export type UploadFileResponse = {
  filename: string
  characters: number
}
