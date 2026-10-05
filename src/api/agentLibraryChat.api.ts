import { AgentLibraryError, libraryClient } from '@/api/agentLibrary.api'
import { endpoints } from '@/api/endpoints'
import { AGENT_LIBRARY_USES_BACKEND } from '@/constants/env'
import type { ChatMessage, StreamEvent } from '@/types/agent'
import type { LibraryAgent, LibraryChatSession } from '@/types/agentLibrary'

// Reads the NDJSON stream a library-agent chat backend speaks: `thought` events
// while it works, then one `final` with the new messages.
async function readMessageStream(response: Response, onThought: (text: string) => void): Promise<ChatMessage[]> {
  if (!response.body) throw new Error('Response has no body to stream')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalMessages: ChatMessage[] | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let newlineIndex = buffer.indexOf('\n')
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim()
      buffer = buffer.slice(newlineIndex + 1)
      newlineIndex = buffer.indexOf('\n')
      if (!line) continue

      const event = JSON.parse(line) as StreamEvent
      if (event.type === 'thought') onThought(event.text)
      else if (event.type === 'final') finalMessages = event.messages
    }
  }

  if (!finalMessages) throw new Error('Stream ended without a final response')
  return finalMessages
}

// Chat with one library agent. Requires a real, dedicated Agent Library backend
// (VITE_AGENT_LIBRARY_API_URL) — there is no local fallback: the old fallback
// piggybacked on the Mojo Analyst Agent's chat endpoints (now retired) and had
// no equivalent on the Elze ADK API, which has no concept of a "library agent"
// brief to inject. `libraryChatAvailable` says whether that backend is
// configured; callers should show an "unavailable" state when it's false
// rather than calling any of the functions below.
//
// REST contract (the backend):
//   GET    /agents/:id/sessions                     → LibraryChatSession[]
//   POST   /agents/:id/sessions                     → LibraryChatSession
//   DELETE /agents/:id/sessions/:sid                → 204
//   GET    /agents/:id/sessions/:sid/messages       → ChatMessage[]
//   POST   /agents/:id/sessions/:sid/messages       { message } → NDJSON stream:
//          {"type":"thought","text":…} … then {"type":"final","session_id":…,"messages":[ChatMessage…]}
//   The backend resolves role, instructions and knowledge from the agent id itself.

export const libraryChatAvailable = AGENT_LIBRARY_USES_BACKEND

export interface LibraryChatApi {
  listSessions(agent: LibraryAgent): Promise<LibraryChatSession[]>
  createSession(agent: LibraryAgent): Promise<LibraryChatSession>
  deleteSession(agent: LibraryAgent, sessionId: string): Promise<void>
  listMessages(agent: LibraryAgent, sessionId: string): Promise<ChatMessage[]>
  send(
    agent: LibraryAgent,
    sessionId: string,
    message: string,
    onThought: (text: string) => void
  ): Promise<ChatMessage[]>
}

const paths = endpoints.agentLibrary

export const libraryChatApi: LibraryChatApi = {
  listSessions: async (agent) => (await libraryClient.get<LibraryChatSession[]>(paths.sessions(agent.id))).data,
  createSession: async (agent) =>
    (await libraryClient.post<LibraryChatSession>(paths.sessions(agent.id), {})).data,
  deleteSession: async (agent, sessionId) => {
    await libraryClient.delete(paths.session(agent.id, sessionId))
  },
  listMessages: async (agent, sessionId) =>
    (await libraryClient.get<ChatMessage[]>(paths.messages(agent.id, sessionId))).data,
  send: async (agent, sessionId, message, onThought) => {
    const response = await fetch(`${libraryClient.defaults.baseURL}${paths.messages(agent.id, sessionId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    if (!response.ok) throw new AgentLibraryError(`The agent did not answer (status ${response.status}).`, response.status)
    return readMessageStream(response, onThought)
  },
}
