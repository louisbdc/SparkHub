import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/notifications/:id/read — mark one notification as read
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id } = await params

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) return sendError('Mise à jour échouée', 500)

    return sendSuccess({ message: 'Notification marquée comme lue' })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
