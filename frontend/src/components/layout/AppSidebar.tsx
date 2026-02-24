'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, LogOut, Plus, Settings } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useCurrentUser, useLogout } from '@/hooks/useAuth'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { useSkeletonVisible } from '@/hooks/useSkeletonVisible'

const CreateWorkspaceDialog = dynamic(
  () => import('@/components/workspace/CreateWorkspaceDialog').then((m) => m.CreateWorkspaceDialog),
  { ssr: false }
)

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/settings', icon: Settings, label: 'Paramètres' },
]

export function SidebarContent() {
  const pathname = usePathname()
  const { data: user } = useCurrentUser()
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces()
  const showWorkspacesSkeleton = useSkeletonVisible(workspacesLoading)
  const logout = useLogout()

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b shrink-0">
        <Image src="/logo_sparkhub.png" alt="Sparkhub" width={28} height={28} className="rounded-lg" />
        <span className="font-semibold text-sm tracking-tight">Sparkhub</span>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Nav */}
        <nav className="flex flex-col gap-0.5 p-3">
          <p className="px-3 py-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
            Menu
          </p>
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                pathname === href
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Workspaces */}
        <nav className="flex flex-col gap-0.5 p-3 flex-1">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
              Workspaces
            </p>
            <CreateWorkspaceDialog
              trigger={
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              }
            />
          </div>

          {showWorkspacesSkeleton && (
            <div className="flex flex-col gap-1 px-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-2 py-2">
                  <Skeleton className="w-2.5 h-2.5 rounded-full shrink-0" />
                  <Skeleton className={`h-3 rounded ${i === 0 ? 'w-24' : i === 1 ? 'w-20' : 'w-28'}`} />
                </div>
              ))}
            </div>
          )}

          {workspaces && workspaces.length === 0 && (
            <p className="px-3 text-xs text-muted-foreground/50 italic">
              Aucun workspace
            </p>
          )}

          {workspaces?.map((ws) => {
            const href = `/workspaces/${ws._id}/kanban`
            const isActive = pathname.startsWith(`/workspaces/${ws._id}`)
            return (
              <Link
                key={ws._id}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: ws.color }}
                />
                <span className="truncate">{ws.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* User */}
      <div className="p-3 border-t shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage src={user?.avatar ?? undefined} />
            <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">{user?.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={logout}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="sr-only">Déconnexion</span>
          </Button>
        </div>
      </div>
    </>
  )
}

export function AppSidebar() {
  return (
    <aside className="hidden md:flex flex-col w-56 border-r bg-background shrink-0 h-full">
      <SidebarContent />
    </aside>
  )
}
