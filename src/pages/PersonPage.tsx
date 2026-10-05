import { useParams } from 'react-router-dom'
import { platformUsers, teamUsers } from '@/api/users.api'
import { useAsync } from '@/hooks/useAsync'
import { usePaths } from '@/hooks/usePaths'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { PersonDetail } from '@/components/common/people/PersonDetail'
import { RoleBadge, StatusBadge } from '@/components/common/Badges'
import { CardGridSkeleton, ErrorState, NotFoundState } from '@/components/common/States'
import { Badge } from '@/components/ui/badge'
import type { PeopleScope } from '@/pages/PeoplePage'

const LABELS = {
  platform: { noun: 'account', title: 'Account', list: 'Users' },
  team: { noun: 'member', title: 'Member', list: 'Members' },
} as const

export default function PersonPage({ scope }: { scope: PeopleScope }) {
  const { userId: userIdParam } = useParams()
  const userId = Number(userIdParam)
  const paths = usePaths()
  const api = scope === 'platform' ? platformUsers : teamUsers
  const labels = LABELS[scope]

  const valid = Number.isInteger(userId) && userId > 0
  const person = useAsync(
    () => (valid ? api.fetch(userId) : Promise.reject(new Error('invalid id'))),
    [userId, valid, api]
  )

  if (!valid) {
    return (
      <Page>
        <NotFoundState detail={`That is not a valid ${labels.noun} address.`} backTo={paths.users} />
      </Page>
    )
  }

  if (person.error) {
    return (
      <Page>
        <PageHeader
          title={labels.title}
          crumbs={[{ label: labels.list, to: paths.users }, { label: 'Not available' }]}
        />
        <Section>
          <ErrorState error={person.error} title={`Unable to load this ${labels.noun}`} onRetry={person.reload} />
        </Section>
      </Page>
    )
  }

  if (person.loading || !person.data) {
    return (
      <Page>
        <PageHeader title={`Loading ${labels.noun}…`} />
        <CardGridSkeleton count={2} />
      </Page>
    )
  }

  const record = person.data

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: labels.list, to: paths.users }, { label: record.username }]}
        title={record.displayName || record.username}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <RoleBadge role={record.role} />
            {record.customRoleName ? <Badge variant="outline">{record.customRoleName}</Badge> : null}
            <StatusBadge status={record.status} />
            <span className="text-xs">{record.email}</span>
            {scope === 'platform' ? (
              record.companyName ? (
                <Badge variant="outline">{record.companyName}</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Platform account
                </Badge>
              )
            ) : null}
          </span>
        }
      />

      <PersonDetail
        person={record}
        onChanged={person.reload}
        actions={{
          updateRole: (role, customRoleId) => api.update(record.id, { role, customRoleId }),
          activate: () => api.activate(record.id),
          deactivate: () => api.deactivate(record.id),
          resendInvitation: () => api.resendActivation(record.id),
        }}
      />
    </Page>
  )
}
