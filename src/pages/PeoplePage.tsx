import { useState } from 'react'
import { Plus } from 'lucide-react'
import { listCompanyOptions } from '@/api/platform.api'
import { platformUsers, teamUsers } from '@/api/users.api'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/authContext'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { PeopleDirectory } from '@/components/common/people/PeopleDirectory'
import { UserOnboardingDialog } from '@/components/common/onboarding/UserOnboardingDialog'
import { Button } from '@/components/ui/button'
import type { CompanyOption } from '@/types/admin'

export type PeopleScope = 'platform' | 'team'

export default function PeoplePage({ scope }: { scope: PeopleScope }) {
  const { can, user } = useAuth()
  const [adding, setAdding] = useState(false)
  const [companyFilter, setCompanyFilter] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const isPlatform = scope === 'platform'
  const api = isPlatform ? platformUsers : teamUsers
  const companies = useAsync<CompanyOption[] | null>(
    () => (isPlatform ? listCompanyOptions() : Promise.resolve(null)),
    [isPlatform]
  )

  const canCreate = can('user.create')

  const addButton = (
    <Button onClick={() => setAdding(true)}>
      <Plus aria-hidden />
      Add a person
    </Button>
  )

  const description = isPlatform
    ? 'Every account across every customer company.'
    : user?.companyName
      ? `Everyone at ${user.companyName}.`
      : 'Everyone in your company.'

  const empty = isPlatform
    ? {
        title: companyFilter ? 'Nobody in this company' : 'No accounts yet',
        body: companyFilter
          ? 'This customer has no accounts. Add their first person, or clear the filter to see everyone.'
          : 'Accounts appear here once customers are onboarded.',
      }
    : {
        title: 'No colleagues yet',
        body: canCreate
          ? 'Add your first colleague. They receive an email with a link to set their own password — you never handle a password for them.'
          : 'Nobody else has been added to this company yet.',
      }

  return (
    <Page>
      <PageHeader
        title={isPlatform ? 'Users' : 'Members'}
        description={description}
        actions={canCreate && addButton}
      />

      <Section flush>
        <PeopleDirectory
          load={api.list}
          refreshKey={refreshKey}
          {...(isPlatform
            ? {
                showCompany: true,
                companies: companies.data ?? undefined,
                companyFilter,
                onCompanyFilterChange: setCompanyFilter,
              }
            : {})}
          actions={{
            activate: (person) => api.activate(person.id),
            deactivate: (person) => api.deactivate(person.id),
            resendInvitation: (person) => api.resendActivation(person.id),
            remove: (person) => api.remove(person.id),
          }}
          empty={{ ...empty, action: canCreate ? addButton : undefined }}
        />
      </Section>

      {isPlatform ? (
        <UserOnboardingDialog
          open={adding}
          onOpenChange={setAdding}
          onCreated={() => setRefreshKey((n) => n + 1)}
          companies={companies.data ?? []}
        />
      ) : (
        <UserOnboardingDialog
          open={adding}
          onOpenChange={setAdding}
          onCreated={() => setRefreshKey((n) => n + 1)}
          fixedCompanyName={user?.companyName ?? null}
        />
      )}
    </Page>
  )
}
