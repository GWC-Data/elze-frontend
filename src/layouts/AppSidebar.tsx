import { useState } from 'react'
import { ChevronDown, ChevronsUpDown, Gem, LogOut } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/hooks/usePaths'
import { accountMenuFor, isNavItemActive, navigationFor } from '@/constants/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { ElzeMark } from '@/components/common/ElzeMark'
import { PlatformTenantSwitcher } from '@/layouts/PlatformTenantSwitcher'

export interface AppSidebarProps {
  onNavigate?: () => void
}

const CREDIT_BALANCE: number = 200

const creditCount = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const creditLabel = (n: number) => `${creditCount.format(n)} credit${n === 1 ? '' : 's'}`

const COLLAPSED_KEY = 'elze.sidebar.collapsedSections'

function readCollapsed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(COLLAPSED_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function writeCollapsed(value: Set<string>) {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...value]))
  } catch {
  }
}

function initials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function AppSidebar({ onNavigate }: AppSidebarProps = {}) {
  const { can, user, signOut } = useAuth()
  const paths = usePaths()
  const { pathname } = useLocation()
  const { setOpenMobile, isMobile, state } = useSidebar()
  const [collapsed, setCollapsed] = useState<Set<string>>(readCollapsed)
  const [signingOut, setSigningOut] = useState(false)

  const groups = navigationFor(paths, can, user?.role)
  const accountItems = accountMenuFor(paths, can)
  const navigate = useNavigate()
  const platform = paths.shell === 'platform'
  const iconRail = state === 'collapsed' && !isMobile


  const isOpen = (key: string) => iconRail || !collapsed.has(key)
  const toggle = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      writeCollapsed(next)
      return next
    })
  }

  const handleNavClick = () => {
    onNavigate?.()
    if (isMobile) setOpenMobile(false)
  }

  const name = user ? user.displayName || user.username : ''

  return (
    <Sidebar collapsible="icon" aria-label={platform ? 'Platform console' : 'Workspace'}>
      <SidebarHeader className="border-b border-sidebar-border px-3.5 py-3">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-2.5 overflow-hidden group-data-[collapsible=icon]:hidden">
            <ElzeMark className="shadow-xs" />
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
                Elze Analytics
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {platform ? 'Platform console' : user?.companyName || 'Workspace'}
              </span>
            </div>
          </div>
          <SidebarTrigger />
        </div>
        {platform ? (
          <div className="mt-2 group-data-[collapsible=icon]:hidden">
            <PlatformTenantSwitcher />
          </div>
        ) : null}
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group, groupIdx) => {
          const key = group.title ?? `group-${groupIdx}`
          const open = !group.title || isOpen(key)
          return (
            <SidebarGroup key={key}>
              {group.title ? <SectionTitle title={group.title} open={open} onToggle={() => toggle(key)} /> : null}
              {open ? (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const active = isNavItemActive(item, pathname)
                      const Icon = item.icon
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                            <NavLink
                              to={item.path}
                              onClick={handleNavClick}
                              aria-current={active ? 'page' : undefined}
                            >
                              <Icon className="size-4 shrink-0" aria-hidden />
                              <span>{item.label}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              ) : null}
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter className="gap-1 border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={`Balance: ${creditLabel(CREDIT_BALANCE)}`}
              className="cursor-default hover:bg-transparent active:bg-transparent"
              aria-label={`Credit balance: ${creditLabel(CREDIT_BALANCE)}`}
            >
              <Gem className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="font-semibold tabular-nums text-sidebar-foreground">
                {creditCount.format(CREDIT_BALANCE)}
              </span>
              <span className="text-muted-foreground">{CREDIT_BALANCE === 1 ? 'credit' : 'credits'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {user ? (
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={name}
                    aria-label={`Account: ${name}`}
                    className="data-[state=open]:bg-sidebar-accent"
                  >
                    <Avatar className="size-8 rounded-lg ring-1 ring-sidebar-border">
                      <AvatarFallback className="rounded-lg bg-sidebar-accent text-xs font-semibold text-sidebar-foreground">
                        {initials(name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="grid min-w-0 flex-1 text-left leading-tight">
                      <span className="truncate text-sm font-semibold">{name}</span>
                      <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                    </span>
                    <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="start"
                  sideOffset={6}
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-48"
                >
                  {accountItems.map((item) => (
                    <DropdownMenuItem
                      key={item.path}
                      onSelect={() => {
                        navigate(item.path)
                        onNavigate?.()
                      }}
                    >
                      <item.icon aria-hidden />
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                  {accountItems.length > 0 ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={signingOut}
                    onSelect={(event) => {
                      event.preventDefault()
                      setSigningOut(true)
                      void signOut().finally(() => setSigningOut(false))
                    }}
                  >
                    <LogOut aria-hidden />
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ) : null}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

function SectionTitle({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <SidebarGroupLabel asChild className="text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full cursor-pointer hover:text-sidebar-foreground"
      >
        <span className="truncate">{title}</span>
        <ChevronDown
          className={cn('ml-auto size-3.5 transition-transform duration-200', !open && '-rotate-90')}
          aria-hidden
        />
      </button>
    </SidebarGroupLabel>
  )
}
