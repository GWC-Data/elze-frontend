import { ADK_API_BASE_URL, ADK_API_KEY, CONTEXT_API_BASE_URL, IS_SAME_ORIGIN_API } from '@/constants/env'
import axios from 'axios'
import type { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'INVALID_REFRESH_TOKEN'
  | 'INVALID_ACTIVATION_TOKEN'
  | 'PASSWORD_CHANGE_REQUIRED'
  | 'ACCOUNT_DISABLED'
  | 'ACCOUNT_PENDING_ACTIVATION'
  | 'COMPANY_DISABLED'
  | 'CSRF_TOKEN_INVALID'
  | 'RATE_LIMITED'
  | 'INSUFFICIENT_PERMISSION'
  | 'TENANT_ACCESS_DENIED'
  | 'FEATURE_NOT_ENABLED'
  | 'VALIDATION_ERROR'
  | 'RESOURCE_NOT_FOUND'
  | 'CONFLICT'
  | 'INVALID_DASHBOARD_ID'
  | 'DASHBOARD_NOT_FOUND'
  | 'INVALID_FILTER'
  | 'CONNECTOR_AUTH_FAILED'
  | 'CONNECTOR_UNREACHABLE'
  | 'EMAIL_DELIVERY_FAILED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly details?: unknown

  constructor(code: ApiErrorCode, message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

interface SuccessEnvelope<T> {
  success: true
  data: T
}

interface ErrorEnvelope {
  success: false
  error: { code: ApiErrorCode; message: string; details?: unknown }
}

const CSRF_COOKIE = 'da_csrf'

function csrfToken(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export type SessionLostReason = 'expired' | 'revoked' | 'disabled'

let onSessionLost: ((reason: SessionLostReason) => void) | null = null

export function setSessionLostHandler(handler: ((reason: SessionLostReason) => void) | null): void {
  onSessionLost = handler
}

export const http: AxiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

declare module 'axios' {
  export interface AxiosRequestConfig {
    renewOnExpiry?: boolean
    retriedAfterRenewal?: boolean
  }
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = csrfToken()
  if (token) config.headers.set('X-CSRF-Token', token)

  return config
})

let refreshInFlight: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const token = csrfToken()
    if (!token) return false
    try {
      const res = await axios.post<SuccessEnvelope<unknown>>(
        '/api/auth/refresh',
        undefined,
        { headers: { 'X-CSRF-Token': token }, withCredentials: true }
      )
      return res.data?.success === true
    } catch {
      return false
    } finally {
      queueMicrotask(() => {
        refreshInFlight = null
      })
    }
  })()

  return refreshInFlight
}

export async function restoreSession(): Promise<boolean> {
  return refreshSession()
}

function envelopeError(data: unknown, status: number): ApiError {
  const envelope = data as ErrorEnvelope | null
  if (envelope && envelope.success === false && envelope.error) {
    return new ApiError(envelope.error.code, envelope.error.message, status, envelope.error.details)
  }
  return new ApiError(
    'INTERNAL_ERROR',
    `The server returned an unexpected response (${status}).`,
    status
  )
}

http.interceptors.response.use(
  (response) => {
    const body = response.data as SuccessEnvelope<unknown> | ErrorEnvelope | null

    if (!body || typeof body !== 'object' || !('success' in body)) {
      throw envelopeError(body, response.status)
    }
    if (body.success === false) throw envelopeError(body, response.status)

    response.data = body.data
    return response
  },
  async (error: AxiosError) => {
    if (error instanceof ApiError) throw error

    const config = error.config as InternalAxiosRequestConfig | undefined

    if (!error.response) {
      throw new ApiError(
        'NETWORK_ERROR',
        'Cannot reach the server. Check your connection and try again.',
        0
      )
    }

    const { status, data } = error.response
    const renewOnExpiry = config?.renewOnExpiry !== false

    if (status === 401 && renewOnExpiry && config && !config.retriedAfterRenewal) {
      const renewed = await refreshSession()
      if (renewed) {
        config.retriedAfterRenewal = true
        return http.request(config)
      }
      onSessionLost?.('expired')
      throw envelopeError(data, status)
    }

    const apiError = envelopeError(data, status)

    if (
      renewOnExpiry &&
      (apiError.code === 'ACCOUNT_DISABLED' || apiError.code === 'COMPANY_DISABLED')
    ) {
      onSessionLost?.('disabled')
    }

    throw apiError
  }
)

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.get<T>(url, config)
  return res.data
}

export async function post<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await http.post<T>(url, body, config)
  return res.data
}

export async function put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.put<T>(url, body, config)
  return res.data
}

export async function patch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await http.patch<T>(url, body, config)
  return res.data
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.delete<T>(url, config)
  return res.data
}

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error && err.message) return err.message
  return fallback
}

export function errorCode(err: unknown): ApiErrorCode | null {
  return err instanceof ApiError ? err.code : null
}

export function isForbidden(err: unknown): boolean {
  const code = errorCode(err)
  return code === 'INSUFFICIENT_PERMISSION' || code === 'TENANT_ACCESS_DENIED' || code === 'FEATURE_NOT_ENABLED'
}

// ------------------------------------------------------------------ agent services
//
// In a deployed stack every /svc/* call passes the backend's agent gate first (nginx
// auth_request, backend/src/routes/gate.routes.ts). So an agent call can now fail the way an
// /api call does: 401 when the 15-minute access token lapsed, 403 when the company lacks the
// feature or the role the permission. These helpers give agent calls the same single-flight
// renewal `http` has, and a readable refusal. Against a service called directly (local dev,
// no gate) a 401 simply renews once and returns the same answer.

const GATE_REASON_HEADER = 'x-gate-reason'

function agentRefusal(status: number, reason: string | null | undefined): string | null {
  if (status !== 403 || !reason) return null
  if (reason === 'FEATURE_NOT_ENABLED') {
    return 'Your company does not have this feature. The platform owner can enable it.'
  }
  return 'Your role does not include this action. A company administrator can change your role.'
}

export async function fetchWithSession(input: string, init?: RequestInit): Promise<Response> {
  const first = await fetch(input, init)
  if (first.status !== 401) return first
  if (!(await refreshSession())) {
    onSessionLost?.('expired')
    return first
  }
  return fetch(input, init)
}

export function agentResponseRefusal(response: Response): string | null {
  return agentRefusal(response.status, response.headers.get(GATE_REASON_HEADER))
}

const contextExternal = axios.create({
  baseURL: CONTEXT_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return new ApiError(
        'NETWORK_ERROR',
        'Cannot reach the context service. Check your connection and try again.',
        0
      )
    }
    const { status, data } = err.response
    const body = data as { error?: { code?: string; message?: string }; detail?: unknown } | null
    const message =
      body?.error?.message ??
      (typeof body?.detail === 'string' ? body.detail : null) ??
      `The context service returned an unexpected response (${status}).`
    const code = status === 404 ? 'RESOURCE_NOT_FOUND' : 'INTERNAL_ERROR'
    return new ApiError((body?.error?.code as never) ?? (code as never), message, status)
  }
  return new ApiError('INTERNAL_ERROR', 'Something went wrong.', 0)
}

async function externalRequest<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const res = await contextExternal.request<T>(config)
    return res.data
  } catch (err) {
    throw toApiError(err)
  }
}

export const contextHttp = {
  get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return IS_SAME_ORIGIN_API
      ? get<T>(path, config)
      : externalRequest<T>({ ...config, url: path, method: 'GET' })
  },
  post<T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return IS_SAME_ORIGIN_API
      ? post<T>(path, body, config)
      : externalRequest<T>({ ...config, url: path, method: 'POST', data: body })
  },
  put<T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return IS_SAME_ORIGIN_API
      ? put<T>(path, body, config)
      : externalRequest<T>({ ...config, url: path, method: 'PUT', data: body })
  },
  patch<T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return IS_SAME_ORIGIN_API
      ? patch<T>(path, body, config)
      : externalRequest<T>({ ...config, url: path, method: 'PATCH', data: body })
  },
  delete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return IS_SAME_ORIGIN_API
      ? del<T>(path, config)
      : externalRequest<T>({ ...config, url: path, method: 'DELETE' })
  },
}

export function isEndpointMissing(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false
  if (err.status !== 404) return false
  if (!IS_SAME_ORIGIN_API) return true
  return /unknown api endpoint/i.test(err.message)
}

export class AgentApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AgentApiError'
    this.status = status
  }
}

export class AdkApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AdkApiError'
    this.status = status
  }
}

function adkHeaders(): Record<string, string> {
  return ADK_API_KEY ? { 'X-API-Key': ADK_API_KEY } : {}
}

async function readAdkErrorDetail(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json()
    const detail = (body as { detail?: unknown } | null)?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail[0] && typeof detail[0].msg === 'string') {
      return String(detail[0].msg)
    }
  } catch {
    return `Request failed with status ${res.status}`
  }
  return `Request failed with status ${res.status}`
}

export async function adkRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchWithSession(`${ADK_API_BASE_URL}${path}`, {
    ...init,
    headers: { ...adkHeaders(), ...(init?.headers as Record<string, string> | undefined) },
  })
  if (!res.ok) throw new AdkApiError(agentResponseRefusal(res) ?? (await readAdkErrorDetail(res)), res.status)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
