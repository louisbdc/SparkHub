'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ticketsApi } from '@/lib/api'
import type { CreateTicketDto, Ticket, TicketPriority, TicketStatus, TicketType, UpdateTicketDto } from '@/types'

const ticketsKey = (workspaceId: string) => ['tickets', workspaceId]
const childTicketsKey = (workspaceId: string, parentId: string) => ['tickets', workspaceId, 'children', parentId]

export function useTickets(workspaceId: string) {
  return useQuery({
    queryKey: ticketsKey(workspaceId),
    queryFn: () => ticketsApi.list(workspaceId),
    enabled: Boolean(workspaceId),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
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
      ticketsApi.update(workspaceId, ticketId, {}, files),
    onSuccess: (updatedTicket) => {
      queryClient.setQueryData<Ticket[]>(
        ticketsKey(workspaceId),
        (prev) => prev?.map((t) => (t._id === updatedTicket._id ? updatedTicket : t)) ?? []
      )
      if (updatedTicket.parentId) {
        queryClient.setQueryData<Ticket[]>(
          childTicketsKey(workspaceId, updatedTicket.parentId),
          (prev) => prev?.map((t) => (t._id === updatedTicket._id ? updatedTicket : t)) ?? []
        )
      }
    },
    onSettled: (updatedTicket) => {
      queryClient.invalidateQueries({ queryKey: ticketsKey(workspaceId) })
      if (updatedTicket?.parentId) {
        queryClient.invalidateQueries({ queryKey: childTicketsKey(workspaceId, updatedTicket.parentId) })
      }
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

export function useChildTickets(workspaceId: string, parentId: string) {
  return useQuery({
    queryKey: childTicketsKey(workspaceId, parentId),
    queryFn: () => ticketsApi.listChildren(workspaceId, parentId),
    enabled: Boolean(workspaceId) && Boolean(parentId),
  })
}

interface CreateChildTicketPayload {
  title: string
  description?: string
  priority: TicketPriority
  type: TicketType
  assigneeId?: string
}

export function useToggleChildDone(workspaceId: string, parentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ticketId, isDone }: { ticketId: string; isDone: boolean }) =>
      ticketsApi.update(workspaceId, ticketId, { status: isDone ? 'done' : 'todo' }),
    onMutate: async ({ ticketId, isDone }) => {
      await queryClient.cancelQueries({ queryKey: childTicketsKey(workspaceId, parentId) })
      const previous = queryClient.getQueryData<Ticket[]>(childTicketsKey(workspaceId, parentId))
      queryClient.setQueryData<Ticket[]>(
        childTicketsKey(workspaceId, parentId),
        (prev) => prev?.map((t) => t._id === ticketId ? { ...t, status: isDone ? 'done' : 'todo' } : t) ?? []
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(childTicketsKey(workspaceId, parentId), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: childTicketsKey(workspaceId, parentId) })
    },
  })
}

export function useCreateChildTicket(workspaceId: string, parentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateChildTicketPayload) =>
      ticketsApi.create(workspaceId, { ...payload, parentId }),
    onSuccess: (newTicket) => {
      queryClient.setQueryData<Ticket[]>(
        childTicketsKey(workspaceId, parentId),
        (prev) => (prev ? [...prev, newTicket] : [newTicket])
      )
    },
  })
}

export function useEditTicket(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ticketId, payload }: { ticketId: string; payload: UpdateTicketDto }) =>
      ticketsApi.update(workspaceId, ticketId, payload),
    onSuccess: (updated) => {
      // Update root tickets cache
      queryClient.setQueryData<Ticket[]>(
        ticketsKey(workspaceId),
        (prev) => prev?.map((t) => (t._id === updated._id ? updated : t)) ?? []
      )
      // Update child tickets cache if it's a sub-ticket
      if (updated.parentId) {
        queryClient.setQueryData<Ticket[]>(
          childTicketsKey(workspaceId, updated.parentId),
          (prev) => prev?.map((t) => (t._id === updated._id ? updated : t)) ?? []
        )
      }
    },
    onSettled: (updated) => {
      queryClient.invalidateQueries({ queryKey: ticketsKey(workspaceId) })
      if (updated?.parentId) {
        queryClient.invalidateQueries({ queryKey: childTicketsKey(workspaceId, updated.parentId) })
      }
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
