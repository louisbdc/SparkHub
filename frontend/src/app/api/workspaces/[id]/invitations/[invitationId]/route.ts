import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { fetchWorkspace } from '@/lib/workspace-queries'

type Params = { params: Promise<{ id: string; invitationId: string }> }

// DELETE /api/workspaces/:id/invitations/:invitationId — cancel a pending invitation
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id, invitationId } = await params

    const workspace = await fetchWorkspace(id)
    if (!workspace) return sendError('Workspace introuvable', 404)
    if (workspace.owner._id !== userId) return sendError('Accès refusé', 403)

    const { error } = await supabaseAdmin
      .from('workspace_invitations')
      .delete()
      .eq('id', invitationId)
      .eq('workspace_id', id)

    if (error) return sendError("Annulation de l'invitation échouée", 500)

    const updated = await fetchWorkspace(id)
    return sendSuccess({ workspace: updated })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
