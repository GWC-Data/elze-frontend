import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePaths } from '@/hooks/usePaths'
import { listCompanyOptions } from '@/api/platform.api'
import { TenantSwitcher } from '@/layouts/TenantSwitcher'
import type { CompanyOption } from '@/types/admin'

export function PlatformTenantSwitcher() {
  const paths = usePaths()
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    listCompanyOptions()
      .then((data) => {
        if (!cancelled) setCompanies(data)
      })
      .catch(() => {
        if (!cancelled) setCompanies([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const select = (companyId: number | null) => {
    setSelectedId(companyId)
    const destination = companyId === null ? paths.companies : paths.company(companyId)
    if (destination) navigate(destination)
  }

  return <TenantSwitcher companies={companies} loading={loading} selectedId={selectedId} onSelect={select} />
}
