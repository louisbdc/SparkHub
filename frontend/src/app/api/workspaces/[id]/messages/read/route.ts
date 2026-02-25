import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { isWorkspaceMemberOrOwner } from '@/lib/workspace-queries'

type Params = { params: Promise<{ id: string }> }

// GET /api/workspaces/:id/messages/read → { count: number }
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id } = await params

    const allowed = await isWorkspaceMemberOrOwner(id, userId)
    if (!allowed) return sendError('Accès refusé', 403)

    const { data: readRow } = await supabaseAdmin
      .from('message_reads')
      .select('last_read_at')
      .eq('user_id', userId)
      .eq('workspace_id', id)
      .maybeSingle()

    const { count, error } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', id)
      .neq('author_id', userId)
      .gt('created_at', readRow?.last_read_at ?? '1970-01-01T00:00:00Z')

    if (error) {
      console.error('[messages/read GET]', error)
      return sendError('Erreur lors du comptage des messages non lus', 500)
    }

    return sendSuccess({ count: count ?? 0 })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}

// POST /api/workspaces/:id/messages/read → 204
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id } = await params

    const allowed = await isWorkspaceMemberOrOwner(id, userId)
    if (!allowed) return sendError('Accès refusé', 403)

    const { error } = await supabaseAdmin
      .from('message_reads')
      .upsert(
        { user_id: userId, workspace_id: id, last_read_at: new Date().toISOString() },
        { onConflict: 'user_id,workspace_id' }
      )

    if (error) {
      console.error('[messages/read POST]', error)
      return sendError('Erreur lors de la mise à jour de la lecture', 500)
    }

    return new Response(null, { status: 204 })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
