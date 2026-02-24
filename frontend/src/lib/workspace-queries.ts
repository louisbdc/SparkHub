/**
 * Shared Supabase query helpers for workspaces.
 * Keeps the nested select string in one place.
 */
import { supabaseAdmin } from './supabase/admin'
import { mapWorkspace } from './db-mappers'
import type { Workspace } from '@/types'

export const WORKSPACE_SELECT = `
  *,
  owner:profiles!workspaces_owner_id_fkey(*),
  members:workspace_members(id, role, joined_at, user:profiles(*))
`

export async function fetchWorkspace(workspaceId: string): Promise<Workspace | null> {
  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .select(WORKSPACE_SELECT)
    .eq('id', workspaceId)
    .single()

  if (error || !data) return null
  return mapWorkspace(data as Parameters<typeof mapWorkspace>[0])
}

export async function listWorkspacesForUser(userId: string): Promise<Workspace[]> {
  // Get workspace IDs where user is a member (not owner)
  const { data: memberOf } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)

  const memberIds = (memberOf ?? []).map((m: { workspace_id: string }) => m.workspace_id)

  // Fetch workspaces the user owns
  const { data: owned } = await supabaseAdmin
    .from('workspaces')
    .select(WORKSPACE_SELECT)
    .eq('owner_id', userId)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })

  // Fetch workspaces the user is a member of
  const memberWorkspaces =
    memberIds.length > 0
      ? (
          await supabaseAdmin
            .from('workspaces')
            .select(WORKSPACE_SELECT)
            .in('id', memberIds)
            .eq('is_archived', false)
            .order('updated_at', { ascending: false })
        ).data ?? []
      : []

  // Deduplicate (edge case: owner is also in members table) and sort
  const seen = new Set<string>()
  return [...(owned ?? []), ...memberWorkspaces]
    .filter((ws) => {
      if (seen.has(ws.id)) return false
      seen.add(ws.id)
      return true
    })
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .map((ws) => mapWorkspace(ws as Parameters<typeof mapWorkspace>[0]))
}

/**
 * Returns true if the user is the workspace owner or a member.
 */
export async function isWorkspaceMemberOrOwner(
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const ws = await fetchWorkspace(workspaceId)
  if (!ws) return false
  if (ws.owner._id === userId) return true
  return ws.members.some((m) => m.user._id === userId)
}
