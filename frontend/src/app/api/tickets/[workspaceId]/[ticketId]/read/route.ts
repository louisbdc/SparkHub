import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'

type Params = { params: Promise<{ workspaceId: string; ticketId: string }> }

// POST /api/tickets/:workspaceId/:ticketId/read
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { ticketId } = await params

    const { error } = await supabaseAdmin
      .from('ticket_reads')
      .upsert({
        user_id: userId,
        ticket_id: ticketId,
        last_read_at: new Date().toISOString()
      }, {
        onConflict: 'user_id, ticket_id'
      })

    if (error) {
      console.error('[ticket read POST] error:', error)
      return sendError('Erreur de marquage', 500)
    }

    return sendSuccess({ success: true })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
