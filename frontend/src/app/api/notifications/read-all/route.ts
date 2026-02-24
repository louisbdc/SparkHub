import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'

// PATCH /api/notifications/read-all — mark all notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) return sendError('Mise à jour échouée', 500)

    return sendSuccess({ message: 'Toutes les notifications marquées comme lues' })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
