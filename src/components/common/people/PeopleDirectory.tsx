import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontal, Trash2, UserCheck, UserX, Mail } from 'lucide-react'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/hooks/usePaths'
import { DataTable, type ColumnDef } from '@/components/common/DataTable'
import { RoleBadge, StatusBadge } from '@/components/common/Badges'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { notify } from '@/lib/notify'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useServerList } from '@/hooks/useServerList'
import type { CompanyOption, ListQuery, Paged, UserListItem } from '@/types/admin'
import type { RoleName, UserStatus } from '@/types/auth'

export type PeopleQuery = ListQuery & { role?: string; status?: string; companyId?: number }

export interface PeopleActions {
  activate: (user: UserListItem) => Promise<unknown>
  deactivate: (user: UserListItem) => Promise<unknown>
  resendInvitation: (user: UserListItem) => Promise<unknown>
  remove: (user: UserListItem) => Promise<unknown>
}

const ALL = '__all__'

function formatLastActive(iso: string | undefined): string {
  if (!iso) return 'Never'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Never'
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function PeopleDirectory({
  load,
  refreshKey = 0,
  actions,
  showCompany = false,
  companies,
  companyFilter,
  onCompanyFilterChange,
  empty,
}: {
  load: (query: PeopleQuery) => Promise<Paged<UserListItem>>
  refreshKey?: number
  actions: PeopleActions
  showCompany?: boolean
  companies?: CompanyOption[]
  companyFilter?: number | null
  onCompanyFilterChange?: (companyId: number | null) => void
  empty: { title: string; body?: string; action?: React.ReactNode }
}) {
  const { user: me } = useAuth()
  const paths = usePaths()
  const navigate = useNavigate()
  const { can } = useAuth()

  const [roleFilter, setRoleFilter] = useState<string>(ALL)
  const [statusFilter, setStatusFilter] = useState<string>(ALL)
  const [removing, setRemoving] = useState<UserListItem | null>(null)
  const [removePending, setRemovePending] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const list = useServerList<UserListItem, Omit<PeopleQuery, keyof ListQuery>>(
    load,
    { page: 1, pageSize: 15, sort: 'name', dir: 'asc' },
    {
      role: roleFilter === ALL ? undefined : roleFilter,
      status: statusFilter === ALL ? undefined : statusFilter,
      companyId: companyFilter ?? undefined,
    }
  )
  const onChanged = list.reload

  useEffect(() => {
    if (refreshKey > 0) onChanged()
  }, [refreshKey, onChanged])

  const run = async (person: UserListItem, work: () => Promise<unknown>, success: string) => {
    setBusyId(person.id)
    try {
      await work()
      notify.success(success)
      onChanged()
    } catch (err) {
      notify.failure('complete that change', err)
    } finally {
      setBusyId(null)
    }
  }

  const confirmRemove = async () => {
    if (!removing) return
    setRemovePending(true)
    try {
      await actions.remove(removing)
      notify.success(`${removing.username} has been deleted.`)
      onChanged()
      setRemoving(null)
    } catch (err) {
      notify.failure('delete that account', err)
    } finally {
      setRemovePending(false)
    }
  }

  const columns: ColumnDef<UserListItem>[] = [
    {
      key: 'name',
      header: 'Name',
      serverSort: 'name',
      render: (person) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {person.displayName || person.username}
          </p>
          <p className="truncate text-xs text-muted-foreground">{person.email}</p>
        </div>
      ),
    },
    ...(showCompany
      ? [
          {
            key: 'company',
            header: 'Company',
            secondary: true,
            serverSort: 'company',
            render: (person: UserListItem) =>
              person.companyName ? (
                <span className="truncate text-sm">{person.companyName}</span>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Platform
                </Badge>
              ),
          } satisfies ColumnDef<UserListItem>,
        ]
      : []),
    {
      key: 'role',
      header: 'Role',
      width: 'w-40',
      serverSort: 'role',
      render: (person) =>
        person.customRoleName ? (
          <span className="flex flex-col gap-0.5">
            <RoleBadge role={person.role} />
            <span className="text-xs text-muted-foreground">{person.customRoleName}</span>
          </span>
        ) : (
          <RoleBadge role={person.role} />
        ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-36',
      serverSort: 'status',
      render: (person) => <StatusBadge status={person.status} />,
    },
    {
      key: 'lastLogin',
      header: 'Last active',
      width: 'w-36',
      secondary: true,
      serverSort: 'lastLogin',
      render: (person) => (
        <span className="text-sm text-muted-foreground">
          {formatLastActive(person.lastLoginAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      width: 'w-14',
      render: (person) => {
        const isSelf = person.id === me?.id
        const canDeactivate = !isSelf && can('user.deactivate')
        const canActivate = !isSelf && can('user.activate')
        const canInvite = can('user.update')
        const canRemove = !isSelf && can('user.delete')

        if (!canDeactivate && !canActivate && !canInvite && !canRemove) return null

        return (
          <div onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={busyId === person.id}
                  aria-label={`Actions for ${person.username}`}
                >
                  <MoreHorizontal aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => navigate(paths.user(person.id))}>
                  Open details
                </DropdownMenuItem>

                {canInvite && person.status !== 'disabled' && (
                  <DropdownMenuItem
                    onSelect={() =>
                      void run(
                        person,
                        () => actions.resendInvitation(person),
                        `A new activation link was sent to ${person.email}.`
                      )
                    }
                  >
                    <Mail aria-hidden />
                    {person.status === 'pending' ? 'Resend invitation' : 'Reset access'}
                  </DropdownMenuItem>
                )}

                {person.status === 'active' && canDeactivate && (
                  <DropdownMenuItem
                    onSelect={() =>
                      void run(
                        person,
                        () => actions.deactivate(person),
                        `${person.username} has been deactivated and signed out.`
                      )
                    }
                  >
                    <UserX aria-hidden />
                    Deactivate
                  </DropdownMenuItem>
                )}

                {person.status === 'disabled' && canActivate && (
                  <DropdownMenuItem
                    onSelect={() =>
                      void run(
                        person,
                        () => actions.activate(person),
                        `${person.username} can sign in again.`
                      )
                    }
                  >
                    <UserCheck aria-hidden />
                    Reactivate
                  </DropdownMenuItem>
                )}

                {canRemove && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(person)}>
                      <Trash2 aria-hidden />
                      Delete account
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <DataTable
        data={list.error ? null : (list.data?.items ?? null)}
        columns={columns}
        keyOf={(person) => person.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        onRowClick={(person) => navigate(paths.user(person.id))}
        searchPlaceholder="Search by name, username or email…"
        server={{
          total: list.data?.total ?? 0,
          query: list.query,
          onQueryChange: list.setQuery,
          narrowed: list.narrowed,
        }}
        empty={empty}
        toolbar={
          <>
            {companies && onCompanyFilterChange && (
              <Select
                value={companyFilter === null || companyFilter === undefined ? ALL : String(companyFilter)}
                onValueChange={(value) =>
                  onCompanyFilterChange(value === ALL ? null : Number(value))
                }
              >
                <SelectTrigger size="sm" className="w-44" aria-label="Filter by company">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={String(company.id)}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger size="sm" className="w-40" aria-label="Filter by role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All roles</SelectItem>
                {(showCompany
                  ? (['SUPER_ADMIN', 'COMPANY_ADMIN', 'USER'] as RoleName[])
                  : (['COMPANY_ADMIN', 'USER'] as RoleName[])
                ).map((role) => (
                  <SelectItem key={role} value={role}>
                    {role === 'SUPER_ADMIN'
                      ? 'Platform owner'
                      : role === 'COMPANY_ADMIN'
                        ? 'Company admin'
                        : 'Member'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger size="sm" className="w-40" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {(['active', 'pending', 'disabled'] as UserStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === 'active' ? 'Active' : status === 'pending' ? 'Invited' : 'Deactivated'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={removing ? `Delete ${removing.username}?` : ''}
        body="This removes the account permanently, along with its dashboard grants and its sessions. It cannot be undone."
        consequence="If this person should simply stop having access, deactivate them instead — that keeps the record and can be reversed."
        confirmLabel="Delete account"
        destructive
        pending={removePending}
        onConfirm={confirmRemove}
      />
    </>
  )
}
