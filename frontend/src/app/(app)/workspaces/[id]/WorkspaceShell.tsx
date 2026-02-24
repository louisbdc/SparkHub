'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { ChevronLeft, FolderOpen, LayoutGrid, MessageSquare, Plus, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TicketDetailPanel } from '@/components/ticket/TicketDetailPanel'
import { CreateTicketForm } from '@/components/ticket/CreateTicketForm'
import { InviteMemberDialog } from '@/components/workspace/InviteMemberDialog'
import { useWorkspace } from '@/hooks/useWorkspaces'
import { useCurrentUser } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { WorkspaceProvider, useWorkspaceContext } from './WorkspaceContext'
import { NotificationBell } from '@/components/layout/NotificationBell'

const NAV_ITEMS = [
  { segment: 'kanban', icon: LayoutGrid, label: 'Kanban' },
  { segment: 'discussion', icon: MessageSquare, label: 'Discussion' },
  { segment: 'files', icon: FolderOpen, label: 'Fichiers' },
]

function Shell({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>()
  const pathname = usePathname()
  const { data: workspace } = useWorkspace(id)
  const { data: user } = useCurrentUser()
  const [createOpen, setCreateOpen] = useState(false)
  const { selectedTicket, setSelectedTicket } = useWorkspaceContext()

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-6 h-14 border-b shrink-0">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>

        {workspace && (
          <>
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: workspace.color }}
            />
            <h1 className="font-semibold text-sm">{workspace.name}</h1>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Secondary actions */}
          <NotificationBell />
          <Link
            href={`/workspaces/${id}/settings`}
            className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="sr-only">Paramètres du workspace</span>
          </Link>
          {user?.role !== 'client' && <InviteMemberDialog workspaceId={id} />}

          {/* Divider */}
          <div className="w-px h-5 bg-border mx-1" />

          {/* Primary action */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Nouveau ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Créer un ticket</DialogTitle>
              </DialogHeader>
              <CreateTicketForm workspaceId={id} onSuccess={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Secondary sidebar */}
        <nav className="flex flex-col gap-0.5 w-44 border-r shrink-0 p-3">
          <p className="px-3 py-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
            Vues
          </p>
          {NAV_ITEMS.map(({ segment, icon: Icon, label }) => {
            const href = `/workspaces/${id}/${segment}`
            const isActive = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={segment}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Page content */}
        <div className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col">
          {children}
        </div>
      </div>

      {/* Shared ticket panel */}
      <TicketDetailPanel
        ticket={selectedTicket}
        workspaceId={id}
        onClose={() => setSelectedTicket(null)}
      />
    </div>
  )
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <Shell>{children}</Shell>
    </WorkspaceProvider>
  )
}
