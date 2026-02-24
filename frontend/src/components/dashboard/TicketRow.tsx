'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from '@/types'
import type { TicketWithWorkspace } from '@/hooks/useDashboardTickets'

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-muted text-muted-foreground',
}

const STATUS_COLORS = {
  backlog: 'bg-muted text-muted-foreground',
  todo: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

interface TicketRowProps {
  ticket: TicketWithWorkspace
}

export function TicketRow({ ticket }: TicketRowProps) {
  return (
    <Link
      href={`/workspaces/${ticket.workspaceId}/kanban`}
      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      {/* Workspace color dot */}
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: ticket.workspaceColor }}
      />

      {/* Title */}
      <span className="flex-1 text-sm truncate group-hover:text-primary transition-colors">
        {ticket.title}
      </span>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Workspace name */}
        <span className="text-[11px] text-muted-foreground hidden sm:block">
          {ticket.workspaceName}
        </span>

        {/* Status */}
        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[ticket.status])}>
          {TICKET_STATUS_LABELS[ticket.status]}
        </span>

        {/* Priority */}
        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', PRIORITY_COLORS[ticket.priority])}>
          {TICKET_PRIORITY_LABELS[ticket.priority]}
        </span>
      </div>
    </Link>
  )
}
