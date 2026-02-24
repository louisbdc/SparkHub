'use client'

import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useChildTickets, useDeleteTicket } from '@/hooks/useTickets'
import { TicketCard } from './TicketCard'
import type { Ticket, TicketPriority, TicketType } from '@/types'

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low:    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high:   'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const TYPE_ICON: Record<TicketType, string> = {
  bug: '🐛', feature: '✨', task: '📋', improvement: '⚡',
}

interface KanbanTicketTreeProps {
  ticket: Ticket
  workspaceId: string
  onTicketClick: (ticket: Ticket) => void
  onTicketEdit?: (ticket: Ticket) => void
  onTicketDelete: (ticketId: string) => void
}

export function KanbanTicketTree({
  ticket, workspaceId, onTicketClick, onTicketEdit, onTicketDelete,
}: KanbanTicketTreeProps) {
  const { data: children = [] } = useChildTickets(workspaceId, ticket._id)
  const deleteTicket = useDeleteTicket(workspaceId)

  return (
    <div>
      <TicketCard
        ticket={ticket}
        onClick={onTicketClick}
        onEdit={onTicketEdit}
        onDelete={onTicketDelete}
      />

      {children.length > 0 && (
        <div className="relative ml-4 mt-1.5 flex flex-col gap-1.5 pb-0.5">
          {/* Vertical connector — stops before centre of last child */}
          <div className="absolute left-0 top-0 bottom-[22px] w-px bg-border/60" />

          {children.map((child) => (
            <div key={child._id} className="relative pl-5">
              {/* Horizontal branch */}
              <div className="absolute left-0 top-[18px] h-px w-5 bg-border/60" />

              <div
                className="group relative bg-card/80 border border-border/60 rounded-lg px-2.5 py-2 hover:border-primary/30 hover:shadow-sm hover:bg-card transition-all cursor-pointer"
                onClick={() => onTicketClick(child)}
              >
                {/* Actions menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {onTicketEdit && (
                      <>
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer"
                          onSelect={() => onTicketEdit(child)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive gap-2 cursor-pointer"
                      onSelect={() => deleteTicket.mutate(child._id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-start gap-1.5 pr-4">
                  <span className="text-xs shrink-0 mt-0.5 leading-none">{TYPE_ICON[child.type]}</span>
                  <p className="text-xs font-medium leading-snug line-clamp-2 flex-1">{child.title}</p>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge
                    variant="secondary"
                    className={cn('text-[9px] px-1 py-0 h-4', PRIORITY_STYLES[child.priority])}
                  >
                    {child.priority}
                  </Badge>
                  {child.assignee && (
                    <Avatar className="ml-auto w-4 h-4 shrink-0" title={child.assignee.name}>
                      <AvatarImage src={child.assignee.avatar ?? undefined} />
                      <AvatarFallback className="text-[8px] font-semibold">
                        {(child.assignee.name[0] ?? '?').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
