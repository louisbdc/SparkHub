import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { isWorkspaceMemberOrOwner } from '@/lib/workspace-queries'
import { mapTicket } from '@/lib/db-mappers'
import { createNotification } from '@/lib/notifications'

type Params = { params: Promise<{ id: string; ticketId: string }> }

const TICKET_SELECT = `
  *,
  reporter:profiles!tickets_reporter_id_fkey(*),
  assignee:profiles!tickets_assignee_id_fkey(*),
  attachments(*)
`

const statusSchema = z.object({
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional(),
  order: z.number().int().min(0).optional(),
})

// PATCH /api/workspaces/:id/tickets/:ticketId/status — kanban drag-and-drop
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id, ticketId } = await params

    const allowed = await isWorkspaceMemberOrOwner(id, userId)
    if (!allowed) return sendError('Accès refusé', 403)

    const body = await request.json()
    const parsed = statusSchema.safeParse(body)
    if (!parsed.success) {
      return sendError(parsed.error.issues[0].message, 422)
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsed.data.status !== undefined) updates.status = parsed.data.status
    if (parsed.data.order !== undefined) updates.order = parsed.data.order

    const { error } = await supabaseAdmin
      .from('tickets')
      .update(updates)
      .eq('id', ticketId)
      .eq('workspace_id', id)

    if (error) return sendError('Mise à jour du statut échouée', 500)

    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select(TICKET_SELECT)
      .eq('id', ticketId)
      .single()

    // Notify reporter and assignee of the status change (excluding the updater)
    if (parsed.data.status) {
      const workspaceLink = `/workspaces/${id}/kanban?ticket=${ticketId}`
      const notifBody = `Statut du ticket "${ticket?.title}" changé en "${parsed.data.status}"`
      const recipients = new Set<string>()
      if (ticket?.reporter_id && ticket.reporter_id !== userId) recipients.add(ticket.reporter_id)
      if (ticket?.assignee_id && ticket.assignee_id !== userId) recipients.add(ticket.assignee_id)
      await Promise.all(
        [...recipients].map((uid) =>
          createNotification(uid, 'ticket_status_changed', 'Statut modifié', notifBody, workspaceLink)
        )
      )
    }

    return sendSuccess({ ticket: mapTicket(ticket) })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
