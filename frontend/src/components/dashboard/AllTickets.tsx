'use client'

import { useState } from 'react'
import { TicketRow } from './TicketRow'
import type { TicketWithWorkspace } from '@/hooks/useDashboardTickets'
import {
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUSES,
  type Workspace,
  type TicketPriority,
} from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent']
const PAGE_SIZE = 20

interface AllTicketsProps {
  allTickets: TicketWithWorkspace[]
  workspaces: Workspace[]
}

export function AllTickets({ allTickets, workspaces }: AllTicketsProps) {
  const [workspaceFilter, setWorkspaceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [page, setPage] = useState(1)

  const filtered = allTickets
    .filter((t) => {
      if (workspaceFilter !== 'all' && t.workspaceId !== workspaceFilter) return false
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      return true
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const visible = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = filtered.length > visible.length

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Tous les tickets ({filtered.length})
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={workspaceFilter}
          onValueChange={(v) => { setWorkspaceFilter(v); setPage(1) }}
        >
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder="Workspace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les workspaces</SelectItem>
            {workspaces.map((ws) => (
              <SelectItem key={ws._id} value={ws._id}>
                {ws.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1) }}
        >
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {TICKET_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {TICKET_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={priorityFilter}
          onValueChange={(v) => { setPriorityFilter(v); setPage(1) }}
        >
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les priorités</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {TICKET_PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <p className="text-sm">Aucun ticket trouvé</p>
          </div>
        ) : (
          <div className="divide-y">
            {visible.map((ticket) => (
              <TicketRow key={ticket._id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
            Voir plus ({filtered.length - visible.length} restants)
          </Button>
        </div>
      )}
    </div>
  )
}
