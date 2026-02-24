'use client'

import { useWorkspace } from '@/hooks/useWorkspaces'
import type { User } from '@/types'

export function dedupeMembers(
  owner: User | undefined,
  members: { user: User }[]
): User[] {
  return [
    ...(owner ? [owner] : []),
    ...members.map((m) => m.user),
  ].filter((u, i, arr) => arr.findIndex((x) => x._id === u._id) === i)
}

export function useWorkspaceMembers(workspaceId: string): User[] {
  const { data: workspace } = useWorkspace(workspaceId)
  if (!workspace) return []
  return dedupeMembers(workspace.owner, workspace.members)
}
