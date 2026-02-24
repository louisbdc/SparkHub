'use client'

import { useParams } from 'next/navigation'
import { WorkspaceDiscussion } from '@/components/workspace/WorkspaceDiscussion'

export default function DiscussionPage() {
  const { id } = useParams<{ id: string }>()

  return <WorkspaceDiscussion workspaceId={id} />
}
