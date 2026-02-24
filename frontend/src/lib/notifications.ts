import { supabaseAdmin } from '@/lib/supabase/admin'
import type { NotificationType } from '@/types'

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('notifications')
    .insert({ user_id: userId, type, title, body, link })

  if (error) {
    console.error('[notifications] insert error:', error)
  }
}
