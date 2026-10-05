import { get, post } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type { ActivationTarget, Profile, SessionResponse, SessionSummary } from '@/types/auth'

export function login(identifier: string, password: string): Promise<SessionResponse> {
  return post<SessionResponse>(endpoints.auth.login, { identifier, password }, { renewOnExpiry: false })
}

export function logout(): Promise<{ state: 'UNAUTHENTICATED' }> {
  return post<{ state: 'UNAUTHENTICATED' }>(endpoints.auth.logout, undefined, { renewOnExpiry: false })
}

export function fetchProfile(): Promise<Profile> {
  return get<Profile>(endpoints.auth.me)
}

export function fetchSessions(): Promise<SessionSummary[]> {
  return get<SessionSummary[]>(endpoints.auth.sessions)
}

export function changePassword(currentPassword: string, newPassword: string): Promise<SessionResponse> {
  return post<SessionResponse>(
    endpoints.auth.changePassword,
    { currentPassword, newPassword },
    { renewOnExpiry: false }
  )
}

export function fetchActivationTarget(token: string): Promise<ActivationTarget> {
  return get<ActivationTarget>(endpoints.auth.activation, {
    params: { token },
    renewOnExpiry: false,
  })
}

export function activateAccount(token: string, password: string): Promise<SessionResponse> {
  return post<SessionResponse>(endpoints.auth.activation, { token, password }, { renewOnExpiry: false })
}
