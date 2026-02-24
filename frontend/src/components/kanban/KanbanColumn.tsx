'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { TicketCard } from './TicketCard'
import type { Ticket, TicketPriority, TicketStatus, TicketType } from '@/types'

const COLUMN_STYLES: Record<TicketStatus, { dot: string; badge: string }> = {
  backlog:     { dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-600' },
  todo:        { dot: 'bg-blue-400',    badge: 'bg-blue-100 text-blue-700' },
  in_progress: { dot: 'bg-yellow-400',  badge: 'bg-yellow-100 text-yellow-700' },
  review:      { dot: 'bg-purple-400',  badge: 'bg-purple-100 text-purple-700' },
  done:        { dot: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-700' },
}

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low:    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high:   'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const TYPE_ICON: Record<TicketType, string> = {
  bug: '🐛', feature: '✨', task: '📋', improvement: '⚡',
}

interface KanbanColumnProps {
  status: TicketStatus
  label: string
  tickets: Ticket[]
  onTicketClick: (ticket: Ticket) => void
  onTicketEdit?: (ticket: Ticket) => void
  onTicketDelete: (ticketId: string) => void
  childrenMap: Map<string, Ticket[]>
}

export function KanbanColumn({
  status, label, tickets, onTicketClick, onTicketEdit, onTicketDelete, childrenMap,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const style = COLUMN_STYLES[status]

  // Only root tickets are draggable; children appear nested below their parent
  const rootTickets = tickets.filter((t) => !t.parentId)
  const rootTicketIds = rootTickets.map((t) => t._id)

  return (
    <div className="flex flex-col w-[85vw] sm:w-72 shrink-0 h-full snap-center">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn('w-2 h-2 rounded-full', style.dot)} />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className={cn('ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full', style.badge)}>
          {rootTickets.length}
        </span>
      </div>

      {/* Drop zone — only root tickets are in the SortableContext */}
      <SortableContext items={rootTicketIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex flex-col gap-2 flex-1 rounded-xl p-2 min-h-[200px] transition-colors',
            isOver ? 'bg-primary/5 border-2 border-dashed border-primary/30' : 'bg-muted/30'
          )}
        >
          {rootTickets.map((ticket) => {
            const children = childrenMap.get(ticket._id) ?? []
            return (
              <div key={ticket._id}>
                <TicketCard
                  ticket={ticket}
                  onClick={onTicketClick}
                  onEdit={onTicketEdit}
                  onDelete={onTicketDelete}
                />

                {/* Tree-nested children */}
                {children.length > 0 && (
                  <div className="relative ml-4 mt-1.5 flex flex-col gap-1.5 pb-0.5">
                    {/* Vertical connector line — stops before the last child's center */}
                    <div className="absolute left-0 top-0 bottom-[22px] w-px bg-border/60" />

                    {children.map((child) => (
                      <div key={child._id} className="relative pl-5">
                        {/* Horizontal branch */}
                        <div className="absolute left-0 top-[18px] h-px w-5 bg-border/60" />

                        {/* Child card */}
                        <button
                          type="button"
                          onClick={() => onTicketClick(child)}
                          className="w-full text-left bg-card/80 border border-border/60 rounded-lg px-2.5 py-2 hover:border-primary/30 hover:shadow-sm hover:bg-card transition-all group"
                        >
                          <div className="flex items-start gap-1.5 pr-1">
                            <span className="text-xs shrink-0 mt-0.5 leading-none">
                              {TYPE_ICON[child.type]}
                            </span>
                            <p className="text-xs font-medium leading-snug line-clamp-2 flex-1">
                              {child.title}
                            </p>
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
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </SortableContext>
    </div>
  )
}
