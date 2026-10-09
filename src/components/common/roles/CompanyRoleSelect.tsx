import { useId } from 'react'
import { listCompanyRoles } from '@/api/companyRoles.api'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/authContext'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const BUILT_IN = 'builtin'

export function CompanyRoleSelect({
  companyId,
  value,
  onChange,
  disabled,
}: {
  companyId: number | null
  value: number | null
  onChange: (roleId: number | null) => void
  disabled?: boolean
}) {
  const id = useId()
  const { can, user } = useAuth()
  const platform = user?.companyId === null
  const readable = can('role.read') && (!platform || companyId !== null)

  const roles = useAsync(
    () => (readable ? listCompanyRoles(platform ? companyId ?? undefined : undefined) : Promise.resolve(null)),
    [readable, platform, companyId]
  )
  const custom = roles.data?.custom ?? []
  const chosen = custom.find((r) => r.id === value) ?? null

  if (!readable) return null

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-foreground">
        Company role
      </Label>
      <Select
        value={value === null ? BUILT_IN : String(value)}
        onValueChange={(next) => onChange(next === BUILT_IN ? null : Number(next))}
        disabled={disabled || roles.loading}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={roles.loading ? 'Loading roles…' : undefined} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={BUILT_IN}>Member</SelectItem>
          {custom.map((role) => (
            <SelectItem key={role.id} value={String(role.id)}>
              {role.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {chosen
          ? chosen.description || `${chosen.permissions.length} permissions, set on the Roles page.`
          : custom.length
            ? 'The built-in Member permissions. Pick one of your company’s roles to replace them.'
            : 'Your company has no roles of its own yet. Create them on the Roles page.'}
      </p>
    </div>
  )
}
