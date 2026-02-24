import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'

type Params = { params: Promise<{ workspaceId: string; ticketId: string; commentId: string }> }

// DELETE /api/tickets/:workspaceId/:ticketId/comments/:commentId
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { commentId } = await params

    const { data: comment } = await supabaseAdmin
      .from('comments')
      .select('author_id')
      .eq('id', commentId)
      .single()

    if (!comment) return sendError('Commentaire introuvable', 404)
    if (comment.author_id !== userId) return sendError('Accès refusé', 403)

    const { error } = await supabaseAdmin.from('comments').delete().eq('id', commentId)
    if (error) return sendError('Suppression échouée', 500)

    return sendSuccess({ message: 'Commentaire supprimé' })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
