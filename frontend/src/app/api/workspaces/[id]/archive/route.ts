import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { fetchWorkspace } from '@/lib/workspace-queries'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/workspaces/:id/archive
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id } = await params

    const workspace = await fetchWorkspace(id)
    if (!workspace) return sendError('Workspace introuvable', 404)
    if (workspace.owner._id !== userId) return sendError('Accès refusé', 403)

    const { error } = await supabaseAdmin
      .from('workspaces')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return sendError('Archivage échoué', 500)

    const updated = await fetchWorkspace(id)
    return sendSuccess({ workspace: updated })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
