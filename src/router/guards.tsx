import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/hooks/usePaths'
import { shellForRole } from '@/router/paths'
import { Page } from '@/components/common/Page'
import { PermissionDeniedState } from '@/components/common/States'
import { featureOfPermission } from '@/constants/features'
import type { AuthStatus, AuthUser } from '@/types/auth'

function isSignedIn(status: AuthStatus, user: AuthUser | null): user is AuthUser {
  return Boolean(user) && (status === 'AUTHENTICATED' || status === 'PASSWORD_CHANGE_REQUIRED')
}

function homeFor(user: AuthUser): string {
  return shellForRole(user.role) === 'platform' ? '/platform' : '/workspace'
}

// `permission` may be a list: holding any one of them is enough.
export function RequirePermission({
  permission,
  children,
}: {
  permission: string | string[]
  children: ReactElement
}) {
  const { can, hasFeature } = useAuth()
  const paths = usePaths()
  const anyOf = Array.isArray(permission) ? permission : [permission]

  if (anyOf.some((p) => can(p))) return children

  // The session only lists the features this account can use, so a missing feature may be the
  // company's or the role's - and the page must not name one either way.
  const feature = featureOfPermission(anyOf[0])
  const detail =
    feature && !hasFeature(feature)
      ? 'This area is not available for your account. Ask your administrator if you need it.'
      : 'Your role does not include access to this area. An administrator can change what your role is permitted to do.'

  return (
    <Page>
      <PermissionDeniedState detail={detail} backTo={paths.overview} />
    </Page>
  )
}

export function RootRedirect() {
  const { status, user } = useAuth()

  if (status === 'RESTORING') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Restoring your session…
      </div>
    )
  }
  if (!isSignedIn(status, user)) return <Navigate to="/login" replace />
  return <Navigate to={homeFor(user)} replace />
}

export function LoginRoute({ children }: { children: ReactElement }) {
  const { status, user } = useAuth()
  if (isSignedIn(status, user)) return <Navigate to={homeFor(user)} replace />
  return children
}

// The Metadata Lakehouse screens used to live under `/context`. Old bookmarks and shared links
// are forwarded to the new address, keeping the rest of the path and the query string.
export function LegacyContextRedirect() {
  const { pathname, search, hash } = useLocation()
  const to = pathname.replace(/\/context(?=\/|$)/, '/metadata-lakehouse')
  return <Navigate to={`${to}${search}${hash}`} replace />
}
