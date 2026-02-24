'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ticketsApi } from '@/lib/api'
import type { CreateTicketDto, Ticket, TicketStatus, UpdateTicketDto } from '@/types'

const ticketsKey = (workspaceId: string) => ['tickets', workspaceId]

export function useTickets(workspaceId: string) {
  return useQuery({
    queryKey: ticketsKey(workspaceId),
    queryFn: () => ticketsApi.list(workspaceId),
    enabled: Boolean(workspaceId),
    refetchInterval: 10_000,
    staleTime: 8_000,
  })
}

export function useCreateTicket(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ payload, files }: { payload: CreateTicketDto; files?: File[] }) =>
      ticketsApi.create(workspaceId, payload, files),
    onSuccess: (newTicket) => {
      queryClient.setQueryData<Ticket[]>(
        ticketsKey(workspaceId),
        (prev) => (prev ? [...prev, newTicket] : [newTicket])
      )
    },
  })
}

export function useAddAttachments(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ticketId, files }: { ticketId: string; files: File[] }) =>
      ticketsApi.update(workspaceId, ticketId, {} as UpdateTicketDto, files),
    onSuccess: (updatedTicket) => {
      queryClient.setQueryData<Ticket[]>(
        ticketsKey(workspaceId),
        (prev) => prev?.map((t) => (t._id === updatedTicket._id ? updatedTicket : t)) ?? []
      )
    },
  })
}

export function useUpdateTicket(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      ticketId,
      payload,
    }: {
      ticketId: string
      payload: { status?: TicketStatus; order?: number }
    }) => ticketsApi.updateStatus(workspaceId, ticketId, {
      status: payload.status as string,
      order: payload.order,
    }),

    // Optimistic update
    onMutate: async ({ ticketId, payload }) => {
      await queryClient.cancelQueries({ queryKey: ticketsKey(workspaceId) })

      const previous = queryClient.getQueryData<Ticket[]>(ticketsKey(workspaceId))

      queryClient.setQueryData<Ticket[]>(
        ticketsKey(workspaceId),
        (prev) =>
          prev?.map((t) => (t._id === ticketId ? { ...t, ...payload } : t)) ?? []
      )

      return { previous }
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ticketsKey(workspaceId), context.previous)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ticketsKey(workspaceId) })
    },
  })
}

export function useDeleteTicket(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ticketId: string) => ticketsApi.delete(workspaceId, ticketId),
    onSuccess: (_data, ticketId) => {
      queryClient.setQueryData<Ticket[]>(
        ticketsKey(workspaceId),
        (prev) => prev?.filter((t) => t._id !== ticketId) ?? []
      )
    },
  })
}

// Helper: group tickets by status preserving order
export function groupTicketsByStatus(tickets: Ticket[]): Record<TicketStatus, Ticket[]> {
  return tickets.reduce(
    (acc, ticket) => {
      const col = acc[ticket.status] ?? []
      return {
        ...acc,
        [ticket.status]: [...col, ticket].sort((a, b) => a.order - b.order),
      }
    },
    { backlog: [], todo: [], in_progress: [], review: [], done: [] } as Record<
      TicketStatus,
      Ticket[]
    >
  )
}
