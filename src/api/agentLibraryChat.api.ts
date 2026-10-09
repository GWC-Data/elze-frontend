import { AgentLibraryError, libraryClient } from '@/api/agentLibrary.api'
import { endpoints } from '@/api/endpoints'
import { AGENT_LIBRARY_USES_BACKEND } from '@/constants/env'
import type { ChatMessage, StreamEvent } from '@/types/agent'
import type { LibraryAgent, LibraryChatSession } from '@/types/agentLibrary'

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
