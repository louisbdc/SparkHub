'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import { TicketCard } from './TicketCard'
import type { Ticket, TicketStatus } from '@/types'

const COLUMN_STYLES: Record<TicketStatus, { dot: string; badge: string }> = {
  backlog: { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600' },
  todo: { dot: 'bg-blue-400', badge: 'bg-blue-100 text-blue-700' },
  in_progress: { dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700' },
  review: { dot: 'bg-purple-400', badge: 'bg-purple-100 text-purple-700' },
  done: { dot: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-700' },
}

interface KanbanColumnProps {
  status: TicketStatus
  label: string
  tickets: Ticket[]
  onTicketClick: (ticket: Ticket) => void
  onTicketDelete: (ticketId: string) => void
}

export function KanbanColumn({ status, label, tickets, onTicketClick, onTicketDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const style = COLUMN_STYLES[status]
  const ticketIds = tickets.map((t) => t._id)

  return (
    <div className="flex flex-col w-72 shrink-0 h-full">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn('w-2 h-2 rounded-full', style.dot)} />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            'ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full',
            style.badge
          )}
        >
          {tickets.length}
        </span>
      </div>

      {/* Drop zone */}
      <SortableContext items={ticketIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex flex-col gap-2 flex-1 rounded-xl p-2 min-h-[200px] transition-colors',
            isOver ? 'bg-primary/5 border-2 border-dashed border-primary/30' : 'bg-muted/30'
          )}
        >
          {tickets.map((ticket) => (
            <TicketCard key={ticket._id} ticket={ticket} onClick={onTicketClick} onDelete={onTicketDelete} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
