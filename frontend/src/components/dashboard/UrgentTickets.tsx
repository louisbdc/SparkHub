'use client'

import { ShieldAlert } from 'lucide-react'
import { TicketRow } from './TicketRow'
import type { TicketWithWorkspace } from '@/hooks/useDashboardTickets'

interface UrgentTicketsProps {
  allTickets: TicketWithWorkspace[]
}

export function UrgentTickets({ allTickets }: UrgentTicketsProps) {
  const urgent = allTickets
    .filter(
      (t) =>
        (t.priority === 'urgent' || t.priority === 'high') &&
        t.status !== 'done'
    )
    .sort((a, b) => {
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1
      return 0
    })
    .slice(0, 5)

  if (urgent.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Tickets urgents / hauts
        </h2>
      </div>

      <div className="rounded-xl border border-red-200 bg-card overflow-hidden dark:border-red-900/40">
        <div className="divide-y divide-red-100 dark:divide-red-900/20">
          {urgent.map((ticket) => (
            <TicketRow key={ticket._id} ticket={ticket} />
          ))}
        </div>
      </div>
    </div>
  )
}
