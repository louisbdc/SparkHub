import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { fetchWorkspace } from '@/lib/workspace-queries'

type Params = { params: Promise<{ id: string; memberId: string }> }

// DELETE /api/workspaces/:id/members/:memberId — remove a member
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id, memberId } = await params

    const workspace = await fetchWorkspace(id)
    if (!workspace) return sendError('Workspace introuvable', 404)
    if (workspace.owner._id !== userId) return sendError('Accès refusé', 403)
    if (memberId === workspace.owner._id) return sendError('Impossible de retirer le propriétaire', 400)

    const { error } = await supabaseAdmin
      .from('workspace_members')
      .delete()
      .eq('workspace_id', id)
      .eq('user_id', memberId)

    if (error) return sendError('Suppression du membre échouée', 500)

    const updated = await fetchWorkspace(id)
    return sendSuccess({ workspace: updated })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
