import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'

type Params = { params: Promise<{ id: string; messageId: string }> }

// DELETE /api/workspaces/:id/messages/:messageId
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { messageId } = await params

    const { data: msg } = await supabaseAdmin
      .from('messages')
      .select('author_id')
      .eq('id', messageId)
      .single()

    if (!msg) return sendError('Message introuvable', 404)
    if (msg.author_id !== userId) return sendError('Accès refusé', 403)

    const { error } = await supabaseAdmin.from('messages').delete().eq('id', messageId)
    if (error) return sendError('Suppression échouée', 500)

    return sendSuccess({ message: 'Message supprimé' })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
