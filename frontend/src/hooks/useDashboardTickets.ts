'use client'

import { useQueries } from '@tanstack/react-query'
import { ticketsApi } from '@/lib/api'
import type { Ticket, Workspace } from '@/types'

export interface TicketWithWorkspace extends Ticket {
  workspaceId: string
  workspaceName: string
  workspaceColor: string
}

export function useDashboardTickets(workspaces: Workspace[] | undefined) {
  const results = useQueries({
    queries: (workspaces ?? []).map((ws) => ({
      queryKey: ['tickets', ws._id],
      queryFn: () => ticketsApi.list(ws._id),
      enabled: Boolean(ws._id),
    })),
  })

  const allTickets: TicketWithWorkspace[] = results.flatMap((result, i) => {
    const ws = workspaces?.[i]
    if (!ws || !result.data) return []
    return result.data.map((ticket) => ({
      ...ticket,
      workspaceId: ws._id,
      workspaceName: ws.name,
      workspaceColor: ws.color,
    }))
  })

  const isLoading = results.some((r) => r.isLoading)

  return { allTickets, isLoading }
}
