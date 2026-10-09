import axios from 'axios'

import { endpoints } from '@/api/endpoints'
import { AGENT_LIBRARY_API_URL, AGENT_LIBRARY_USES_BACKEND } from '@/constants/env'
import type { AgentSchedule, LibraryAgent, LibraryAgentInput } from '@/types/agentLibrary'

export interface AgentLibraryApi {
  list(): Promise<LibraryAgent[]>
  get(id: string): Promise<LibraryAgent>
  create(input: LibraryAgentInput): Promise<LibraryAgent>
  update(id: string, input: LibraryAgentInput): Promise<LibraryAgent>
  remove(id: string): Promise<void>
  setSchedule(id: string, schedule: AgentSchedule): Promise<LibraryAgent>
  clearSchedule(id: string): Promise<LibraryAgent>
}

export class AgentLibraryError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AgentLibraryError'
    this.status = status
  }
}

export const libraryClient = axios.create({ baseURL: AGENT_LIBRARY_API_URL })

libraryClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 0
      const body = error.response?.data as { detail?: unknown; error?: { message?: unknown } } | undefined
      const message =
        typeof body?.detail === 'string'
          ? body.detail
          : typeof body?.error?.message === 'string'
            ? body.error.message
            : error.message || `Request failed with status ${status}`
      return Promise.reject(new AgentLibraryError(message, status))
    }
    return Promise.reject(error)
  }
)

const paths = endpoints.agentLibrary

const httpAdapter: AgentLibraryApi = {
  list: async () => (await libraryClient.get<LibraryAgent[]>(paths.agents)).data,
  get: async (id) => (await libraryClient.get<LibraryAgent>(paths.agent(id))).data,
  create: async (input) => (await libraryClient.post<LibraryAgent>(paths.agents, input)).data,
  update: async (id, input) => (await libraryClient.put<LibraryAgent>(paths.agent(id), input)).data,
  remove: async (id) => {
    await libraryClient.delete(paths.agent(id))
  },
  setSchedule: async (id, schedule) =>
    (await libraryClient.put<LibraryAgent>(paths.schedule(id), schedule)).data,
  clearSchedule: async (id) => (await libraryClient.delete<LibraryAgent>(paths.schedule(id))).data,
}

const STORAGE_KEY = 'elze.agentLibrary.agents'

function readAll(): LibraryAgent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('stored agents are not a list')
    return parsed as LibraryAgent[]
  } catch (error) {
    throw new AgentLibraryError(
      `Couldn't read agents saved in this browser (${error instanceof Error ? error.message : 'unknown error'}).`,
      0
    )
  }
}

function writeAll(agents: LibraryAgent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agents))
  } catch {
    throw new AgentLibraryError("Couldn't save to this browser's storage.", 0)
  }
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `agent-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function mutate(id: string, change: (agent: LibraryAgent) => LibraryAgent): LibraryAgent {
  const agents = readAll()
  const index = agents.findIndex((agent) => agent.id === id)
  if (index === -1) throw new AgentLibraryError('Agent not found.', 404)
  const next = { ...change(agents[index]), updatedAt: new Date().toISOString() }
  agents[index] = next
  writeAll(agents)
  return next
}

const localAdapter: AgentLibraryApi = {
  list: async () => [...readAll()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  get: async (id) => {
    const agent = readAll().find((item) => item.id === id)
    if (!agent) throw new AgentLibraryError('Agent not found.', 404)
    return agent
  },
  create: async (input) => {
    const now = new Date().toISOString()
    const agent: LibraryAgent = { ...input, id: newId(), schedule: null, createdAt: now, updatedAt: now }
    writeAll([...readAll(), agent])
    return agent
  },
  update: async (id, input) => mutate(id, (agent) => ({ ...agent, ...input })),
  remove: async (id) => {
    writeAll(readAll().filter((agent) => agent.id !== id))
  },
  setSchedule: async (id, schedule) => mutate(id, (agent) => ({ ...agent, schedule })),
  clearSchedule: async (id) => mutate(id, (agent) => ({ ...agent, schedule: null })),
}

export const agentLibraryApi: AgentLibraryApi = AGENT_LIBRARY_USES_BACKEND ? httpAdapter : localAdapter

export function agentLibraryErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}
