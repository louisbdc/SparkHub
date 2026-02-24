import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { isWorkspaceMemberOrOwner } from '@/lib/workspace-queries'
import { mapComment } from '@/lib/db-mappers'
import { createNotification } from '@/lib/notifications'

type Params = { params: Promise<{ workspaceId: string; ticketId: string }> }

const COMMENT_SELECT = `*, author:profiles!comments_author_id_fkey(*)`

const createSchema = z.object({
  content: z.string().min(1).max(4000),
})

// GET /api/tickets/:workspaceId/:ticketId/comments
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { workspaceId, ticketId } = await params

    const allowed = await isWorkspaceMemberOrOwner(workspaceId, userId)
    if (!allowed) return sendError('Accès refusé', 403)

    const { data: comments, error } = await supabaseAdmin
      .from('comments')
      .select(COMMENT_SELECT)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (error) return sendError('Erreur lors de la récupération des commentaires', 500)

    return sendSuccess({ comments: (comments ?? []).map(mapComment) })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}

// POST /api/tickets/:workspaceId/:ticketId/comments
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { workspaceId, ticketId } = await params

    const allowed = await isWorkspaceMemberOrOwner(workspaceId, userId)
    if (!allowed) return sendError('Accès refusé', 403)

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return sendError(parsed.error.issues[0].message, 422)
    }

    const { data: created, error } = await supabaseAdmin
      .from('comments')
      .insert({ ticket_id: ticketId, author_id: userId, content: parsed.data.content })
      .select('id')
      .single()

    if (error || !created) return sendError('Création du commentaire échouée', 500)

    const { data: comment } = await supabaseAdmin
      .from('comments')
      .select(COMMENT_SELECT)
      .eq('id', created.id)
      .single()

    // Notify ticket reporter and assignee (excluding the commenter)
    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('title, reporter_id, assignee_id')
      .eq('id', ticketId)
      .single()

    if (ticket) {
      const workspaceLink = `/workspaces/${workspaceId}/kanban?ticket=${ticketId}`
      const notifBody = `Nouveau commentaire sur le ticket "${ticket.title}"`
      const recipients = new Set<string>()
      if (ticket.reporter_id !== userId) recipients.add(ticket.reporter_id)
      if (ticket.assignee_id && ticket.assignee_id !== userId) recipients.add(ticket.assignee_id)
      await Promise.all(
        [...recipients].map((uid) =>
          createNotification(uid, 'ticket_commented', 'Nouveau commentaire', notifBody, workspaceLink)
        )
      )
    }

    return sendSuccess({ comment: mapComment(comment) }, 201)
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
