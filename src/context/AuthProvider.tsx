import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { restoreSession, setSessionLostHandler } from '@/api/client'
import { fetchProfile, login as loginRequest, logout as logoutRequest } from '@/api/auth.api'
import { notify } from '@/lib/notify'
import { AuthContext } from '@/context/authContext'
import type { AuthState } from '@/context/authContext'
import type { AccessibleDashboard, AuthStatus, AuthUser, SessionResponse } from '@/types/auth'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('RESTORING')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [dashboards, setDashboards] = useState<AccessibleDashboard[]>([])

  const statusRef = useRef(status)
  useEffect(() => {
    statusRef.current = status
  }, [status])

  const clearSession = useCallback((next: AuthStatus) => {
    setUser(null)
    setDashboards([])
    setStatus(next)
  }, [])

  const applyProfile = useCallback(async () => {
    const profile = await fetchProfile()
    setUser(profile.user)
    setDashboards(profile.dashboards)
    setStatus(profile.state === 'PASSWORD_CHANGE_REQUIRED' ? 'PASSWORD_CHANGE_REQUIRED' : 'AUTHENTICATED')
  }, [])

  useEffect(() => {
    setSessionLostHandler((reason) => {
      if (statusRef.current === 'RESTORING' || statusRef.current === 'UNAUTHENTICATED') return

      if (reason === 'disabled') {
        clearSession('ACCOUNT_DISABLED')
        notify.error('Your access has been withdrawn.', 'Contact your administrator.')
      } else {
        clearSession('SESSION_EXPIRED')
        notify.warning('Your session has expired.', 'Sign in again to continue.')
      }
    })
    return () => setSessionLostHandler(null)
  }, [clearSession])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const restored = await restoreSession()
      if (cancelled) return
      if (!restored) {
        setStatus('UNAUTHENTICATED')
        return
      }
      try {
        await applyProfile()
      } catch {
        if (!cancelled) clearSession('UNAUTHENTICATED')
      }
    }
    void run()

    return () => {
      cancelled = true
    }
  }, [applyProfile, clearSession])

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState !== 'visible') return
      if (statusRef.current !== 'AUTHENTICATED') return
      applyProfile().catch(() => undefined)
    }
    document.addEventListener('visibilitychange', onFocus)
    return () => document.removeEventListener('visibilitychange', onFocus)
  }, [applyProfile])

  const adoptSession = useCallback((response: SessionResponse) => {
    setUser(response.user)
    setStatus(response.state === 'PASSWORD_CHANGE_REQUIRED' ? 'PASSWORD_CHANGE_REQUIRED' : 'AUTHENTICATED')
  }, [])

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      const session = await loginRequest(identifier, password)

      if (session.state === 'PASSWORD_CHANGE_REQUIRED') {
        setUser(session.user)
        setStatus('PASSWORD_CHANGE_REQUIRED')
        return
      }
      await applyProfile()
    },
    [applyProfile]
  )

  const signOut = useCallback(async () => {
    try {
      await logoutRequest()
      notify.info('You have been signed out.')
    } catch {
      notify.warning('Signed out locally.', 'The server could not be reached to end the session.')
    } finally {
      clearSession('UNAUTHENTICATED')
    }
  }, [clearSession])

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      dashboards,
      signIn,
      signOut,
      adoptSession,
      refresh: applyProfile,
      can: (permission: string) => Boolean(user?.permissions?.includes(permission)),
      hasFeature: (feature: string) =>
        user?.role === 'SUPER_ADMIN' || Boolean(user?.features?.includes(feature)),
    }),
    [status, user, dashboards, signIn, signOut, adoptSession, applyProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
