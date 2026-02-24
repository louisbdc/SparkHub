import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { mapNotification } from '@/lib/db-mappers'

// GET /api/notifications — last 50 notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return sendError('Erreur lors de la récupération des notifications', 500)

    const notifications = (data ?? []).map(mapNotification)
    const unreadCount = notifications.filter((n) => !n.isRead).length

    return sendSuccess({ notifications, unreadCount })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
