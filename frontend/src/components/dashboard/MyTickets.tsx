'use client'

import { CheckCircle2 } from 'lucide-react'
import { TicketRow } from './TicketRow'
import type { TicketWithWorkspace } from '@/hooks/useDashboardTickets'

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 }

interface MyTicketsProps {
  allTickets: TicketWithWorkspace[]
  userId: string | undefined
}

export function MyTickets({ allTickets, userId }: MyTicketsProps) {
  const mine = allTickets
    .filter((t) => t.assignee?._id === userId && t.status !== 'done')
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, 8)

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Mes tickets
      </h2>

      <div className="rounded-xl border bg-card overflow-hidden">
        {mine.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <CheckCircle2 className="w-6 h-6 opacity-30" />
            <p className="text-sm">Aucun ticket assigné</p>
          </div>
        ) : (
          <div className="divide-y">
            {mine.map((ticket) => (
              <TicketRow key={ticket._id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
