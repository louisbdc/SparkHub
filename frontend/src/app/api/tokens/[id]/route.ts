import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'

// DELETE /api/tokens/:id → revoke a personal token
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth(request)
    const { id } = await params

    const { error } = await supabaseAdmin
      .from('personal_api_tokens')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) return sendError('Suppression échouée', 500)
    return sendSuccess({ deleted: true })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
