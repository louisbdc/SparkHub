'use client'

import { useParams } from 'next/navigation'
import { WorkspaceFiles } from '@/components/workspace/WorkspaceFiles'
import { useWorkspaceContext } from '../WorkspaceContext'

export default function FilesPage() {
  const { id } = useParams<{ id: string }>()
  const { setSelectedTicket } = useWorkspaceContext()

  return (
    <div className="h-full overflow-y-auto">
      <WorkspaceFiles workspaceId={id} onTicketClick={setSelectedTicket} />
    </div>
  )
}
