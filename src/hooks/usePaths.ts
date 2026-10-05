import { useAuth } from '@/context/authContext'
import { pathsForRole, type AppPaths } from '@/router/paths'

export function usePaths(): AppPaths {
  const { user } = useAuth()
  if (!user) {
    throw new Error('usePaths requires an authenticated user; render it inside a shell layout.')
  }
  return pathsForRole(user.role)
}
