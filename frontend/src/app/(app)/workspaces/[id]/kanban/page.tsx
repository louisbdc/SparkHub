'use client'

import { useParams } from 'next/navigation'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { useWorkspaceContext } from '../WorkspaceContext'

export default function KanbanPage() {
  const { id } = useParams<{ id: string }>()
  const { setSelectedTicket } = useWorkspaceContext()

  return <KanbanBoard workspaceId={id} onTicketClick={setSelectedTicket} />
}
