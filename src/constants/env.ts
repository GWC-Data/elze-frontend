const RAW_CONTEXT_API_URL = import.meta.env.VITE_CONTEXT_API_URL

export const CONTEXT_API_BASE_URL: string =
  typeof RAW_CONTEXT_API_URL === 'string' && RAW_CONTEXT_API_URL.trim()
    ? RAW_CONTEXT_API_URL.trim().replace(/\/+$/, '')
    : '/api'

export const IS_SAME_ORIGIN_API = CONTEXT_API_BASE_URL.startsWith('/')

export const ADK_API_BASE_URL: string = import.meta.env.VITE_ADK_API_BASE_URL || 'http://127.0.0.1:7070'

export const ADK_API_KEY: string = import.meta.env.VITE_ADK_API_KEY || ''

const RAW_AGENT_LIBRARY_API_URL = import.meta.env.VITE_AGENT_LIBRARY_API_URL

export const AGENT_LIBRARY_API_URL: string =
  typeof RAW_AGENT_LIBRARY_API_URL === 'string' ? RAW_AGENT_LIBRARY_API_URL.trim().replace(/\/+$/, '') : ''

export const AGENT_LIBRARY_USES_BACKEND = AGENT_LIBRARY_API_URL !== ''
