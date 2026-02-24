'use client'

import { useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Ticket, TicketPriority, TicketType } from '@/types'

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const TYPE_ICON: Record<TicketType, string> = {
  bug: '🐛',
  feature: '✨',
  task: '📋',
  improvement: '⚡',
}

interface TicketCardProps {
  ticket: Ticket
  onClick: (ticket: Ticket) => void
  onEdit?: (ticket: Ticket) => void
  onDelete: (ticketId: string) => void
}

export function TicketCard({ ticket, onClick, onEdit, onDelete }: TicketCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ticket._id })
  const skipClick = useRef(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative bg-card border rounded-lg p-3 cursor-pointer select-none',
        'hover:shadow-sm hover:border-primary/30 transition-all',
        isDragging && 'opacity-50 shadow-lg border-primary/50 rotate-1'
      )}
      onClick={() => {
        if (skipClick.current) return
        onClick(ticket)
      }}
    >
      {/* Actions menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {onEdit && (
            <>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onSelect={() => {
                  skipClick.current = true
                  setTimeout(() => { skipClick.current = false }, 0)
                  onEdit(ticket)
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive gap-2 cursor-pointer"
            onSelect={() => {
              skipClick.current = true
              setTimeout(() => { skipClick.current = false }, 0)
              onDelete(ticket._id)
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Type icon + title */}
      <div className="flex items-start gap-2 pr-5">
        <span className="text-sm mt-0.5 shrink-0">{TYPE_ICON[ticket.type]}</span>
        <p className="text-sm font-medium leading-snug line-clamp-2">{ticket.title}</p>
      </div>

      {/* Footer */}
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <Badge
          variant="secondary"
          className={cn('text-[10px] px-1.5 py-0', PRIORITY_STYLES[ticket.priority])}
        >
          {ticket.priority}
        </Badge>

        {ticket.assignee && (
          <Avatar className="ml-auto w-5 h-5 shrink-0" title={ticket.assignee.name}>
            <AvatarImage src={ticket.assignee.avatar ?? undefined} />
            <AvatarFallback className="text-[9px] font-semibold">
              {ticket.assignee.name[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}
