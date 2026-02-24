'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { KanbanColumn } from './KanbanColumn'
import { TicketCard } from './TicketCard'
import { Skeleton } from '@/components/ui/skeleton'
import {
  groupTicketsByStatus,
  useTickets,
  useUpdateTicket,
  useDeleteTicket,
} from '@/hooks/useTickets'
import type { Ticket, TicketStatus } from '@/types'
import { TICKET_STATUS_LABELS, TICKET_STATUSES } from '@/types'

interface KanbanBoardProps {
  workspaceId: string
  onTicketClick: (ticket: Ticket) => void
}

export function KanbanBoard({ workspaceId, onTicketClick }: KanbanBoardProps) {
  const { data: tickets = [], isLoading } = useTickets(workspaceId)
  const updateTicket = useUpdateTicket(workspaceId)
  const deleteTicket = useDeleteTicket(workspaceId)

  // Local copy so we can update order synchronously on drop (no snap-back)
  const [items, setItems] = useState<Ticket[]>(tickets)
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const isDraggingRef = useRef(false)

  // Stable key based on ticket content — avoids re-firing when React Query
  // returns a new array reference with the same data (would otherwise loop)
  const ticketsKey = tickets
    .map((t) => `${t._id}:${t.status}:${t.order}:${t.updatedAt}`)
    .join('|')

  // Sync from server when not mid-drag (background refetches, mutations settling…)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isDraggingRef.current) {
      setItems(tickets)
    }
  }, [ticketsKey])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const grouped = groupTicketsByStatus(items)

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      isDraggingRef.current = true
      const found = items.find((t) => t._id === active.id)
      setActiveTicket(found ?? null)
    },
    [items]
  )

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      isDraggingRef.current = false
      setActiveTicket(null)
      if (!over) return

      const activeId = active.id as string
      const overId = over.id as string

      const targetStatus = (
        TICKET_STATUSES.includes(overId as TicketStatus)
          ? overId
          : items.find((t) => t._id === overId)?.status
      ) as TicketStatus | undefined

      if (!targetStatus) return

      const sourceTicket = items.find((t) => t._id === activeId)
      if (!sourceTicket) return

      const isSameColumn = sourceTicket.status === targetStatus
      const currentGrouped = groupTicketsByStatus(items)

      if (isSameColumn) {
        const column = currentGrouped[targetStatus]
        const oldIndex = column.findIndex((t) => t._id === activeId)
        const newIndex = column.findIndex((t) => t._id === overId)
        if (oldIndex === newIndex) return

        const reordered = arrayMove(column, oldIndex, newIndex)

        // Synchronous local update — card lands instantly without snap-back
        setItems((prev) =>
          prev.map((t) => {
            const idx = reordered.findIndex((r) => r._id === t._id)
            return idx !== -1 ? { ...t, order: idx } : t
          })
        )

        reordered.forEach((ticket, index) => {
          if (ticket.order !== index) {
            updateTicket.mutate({ ticketId: ticket._id, payload: { order: index } })
          }
        })
      } else {
        const targetColumn = currentGrouped[targetStatus]
        const newOrder = targetColumn.length

        // Synchronous local update
        setItems((prev) =>
          prev.map((t) =>
            t._id === activeId ? { ...t, status: targetStatus, order: newOrder } : t
          )
        )

        updateTicket.mutate({
          ticketId: activeId,
          payload: { status: targetStatus, order: newOrder },
        })
      }
    },
    [items, updateTicket]
  )

  return (
    <div className="relative h-full overflow-hidden">
      {/* Skeleton overlay — CSS crossfade, no timing hacks needed */}
      <div
        className={cn(
          'absolute inset-0 z-10 pointer-events-none transition-opacity duration-200',
          isLoading ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="flex gap-4 p-4 sm:p-6 h-full overflow-hidden">
          {[3, 2, 1, 1].map((cardCount, i) => (
            <div key={i} className="flex flex-col w-[85vw] sm:w-72 shrink-0 gap-3">
              <div className="flex items-center gap-2 px-1">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-6 ml-auto rounded-full" />
              </div>
              <div className="flex flex-col gap-2 rounded-xl bg-muted/30 p-2">
                {[...Array(cardCount)].map((_, j) => (
                  <div key={j} className="rounded-lg border bg-card p-3 space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <div className="flex gap-1.5 mt-3">
                      <Skeleton className="h-4 w-12 rounded-full" />
                      <Skeleton className="h-4 w-14 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real content — always rendered, fades in as skeleton fades out */}
      <div
        className={cn(
          'h-full transition-opacity duration-200',
          isLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'
        )}
      >
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 p-4 sm:p-6 overflow-x-auto h-full snap-x snap-mandatory">
            {TICKET_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                label={TICKET_STATUS_LABELS[status]}
                tickets={grouped[status]}
                onTicketClick={onTicketClick}
                onTicketDelete={(ticketId) => deleteTicket.mutate(ticketId)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTicket && (
              <div className="rotate-2 shadow-xl opacity-90">
                <TicketCard ticket={activeTicket} onClick={() => {}} onDelete={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
