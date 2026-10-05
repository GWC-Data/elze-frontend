import { Building2, Check, ChevronsUpDown, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CompanyAvatar } from '@/components/common/CompanyAvatar'
import { ActiveBadge } from '@/components/common/Badges'
import type { CompanyOption } from '@/types/admin'

export function TenantSwitcher({
  companies,
  loading,
  selectedId,
  onSelect,
}: {
  companies: CompanyOption[]
  loading: boolean
  selectedId: number | null
  onSelect: (companyId: number | null) => void
}) {
  const selected = companies.find((company) => company.id === selectedId) ?? null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-label="Switch tenant context"
          className="max-w-[16rem] justify-between gap-2 font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected ? (
              <>
                <CompanyAvatar name={selected.name} size="xs" />
                <span className="truncate font-medium">{selected.name}</span>
              </>
            ) : (
              <>
                <Globe className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate">All customers</span>
              </>
            )}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Find a customer…" />
          <CommandList>
            <CommandEmpty>
              {loading ? 'Loading customers…' : 'No customer matches that.'}
            </CommandEmpty>

            <CommandGroup heading="Context">
              <CommandItem
                value="all-customers"
                onSelect={() => onSelect(null)}
                className="gap-2"
              >
                <Globe className="size-4 text-muted-foreground" aria-hidden />
                <span className="flex-1">All customers</span>
                {selectedId === null && <Check className="size-4" aria-hidden />}
              </CommandItem>
            </CommandGroup>

            {companies.length > 0 && (
              <CommandGroup heading="Customers">
                {companies.map((company) => (
                  <CommandItem
                    key={company.id}
                    value={company.name}
                    onSelect={() => onSelect(company.id)}
                    className="gap-2"
                  >
                    <CompanyAvatar name={company.name} size="xs" />
                    <span className="min-w-0 flex-1 truncate">{company.name}</span>
                    {!company.active && <ActiveBadge active={false} className="text-[10px]" />}
                    {selectedId === company.id && <Check className="size-4" aria-hidden />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function TenantLabel({ companyName }: { companyName: string | null }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border border-border/80 bg-muted/40 px-2.5 py-1 text-xs shadow-2xs',
        'font-medium text-foreground transition-colors'
      )}
    >
      {companyName ? (
        <>
          <CompanyAvatar name={companyName} size="xs" />
          <span className="max-w-[14rem] truncate font-semibold text-foreground">{companyName}</span>
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            Workspace
          </span>
        </>
      ) : (
        <>
          <Building2 className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="font-semibold text-foreground">Workspace</span>
        </>
      )}
    </div>
  )
}
