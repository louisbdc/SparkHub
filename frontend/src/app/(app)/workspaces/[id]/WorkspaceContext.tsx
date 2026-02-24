'use client'

import { createContext, useContext, useState } from 'react'
import type { Ticket } from '@/types'

interface WorkspaceContextValue {
  selectedTicket: Ticket | null
  setSelectedTicket: (ticket: Ticket | null) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  return (
    <WorkspaceContext.Provider value={{ selectedTicket, setSelectedTicket }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspaceContext() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspaceContext must be used within WorkspaceProvider')
  return ctx
}
