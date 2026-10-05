// The Agent Library: user-defined agents (a name, a role, instructions and published
// Metadata Lakehouse contexts as knowledge), modelled on Domo's AI Library.
//
// These shapes are the wire contract for the separate agent-library backend
// (VITE_AGENT_LIBRARY_API_URL). The browser-storage adapter stores exactly the same
// shapes, so switching to the backend changes nothing above api/agentLibrary.api.ts.

// A published context version attached as knowledge. The descriptive fields are copied
// at attach time so a card can render without a second call, and so the agent still
// says what it was given if that version is later deleted.
export interface AgentKnowledgeRef {
  contextVersionId: string
  connectionId: string
  connectionName: string
  name: string
  label: string
  version: number
}

export type AgentScheduleFrequency = 'once' | 'daily' | 'weekly' | 'monthly'

export interface AgentSchedule {
  enabled: boolean
  frequency: AgentScheduleFrequency
  // Local wall-clock time, 'HH:mm', interpreted in `timezone`.
  time: string
  // IANA zone, e.g. 'Asia/Kolkata'. Sent explicitly: the server must not guess it.
  timezone: string
  // 0 = Sunday … 6 = Saturday. Only for 'weekly'.
  daysOfWeek?: number[]
  // 1–28. Only for 'monthly' (capped at 28 so every month has the day).
  dayOfMonth?: number
  // 'YYYY-MM-DD'. Only for 'once'.
  date?: string
  // What the agent is asked when the trigger fires.
  prompt: string
  // Optional: where the run's result is sent.
  recipientEmail?: string
}

export interface LibraryAgent {
  id: string
  name: string
  description: string
  role: string
  instructions: string
  knowledge: AgentKnowledgeRef[]
  schedule: AgentSchedule | null
  // The account that created it (lib/agentAccess.ts). A backend must set this from the
  // session, never from the body; missing on agents made before it was recorded.
  ownerId?: number | null
  createdAt: string
  updatedAt: string
}

export interface LibraryAgentInput {
  name: string
  description: string
  role: string
  instructions: string
  knowledge: AgentKnowledgeRef[]
  // Sent on create only, and only honoured by the browser-storage adapter.
  ownerId?: number
}

// One conversation with a library agent (the chat page's sidebar).
export interface LibraryChatSession {
  id: string
  // First question asked, or '' before one is.
  title: string
  updatedAt: string
}
