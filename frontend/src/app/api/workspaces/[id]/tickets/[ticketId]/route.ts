import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { isWorkspaceMemberOrOwner } from '@/lib/workspace-queries'
import { mapTicket } from '@/lib/db-mappers'
import { uploadFile } from '@/lib/file-upload'
import { createNotification } from '@/lib/notifications'
import { sendTicketAssignedEmail } from '@/lib/email'

type Params = { params: Promise<{ id: string; ticketId: string }> }

const TICKET_SELECT = `
  *,
  reporter:profiles!tickets_reporter_id_fkey(*),
  assignee:profiles!tickets_assignee_id_fkey(*),
  attachments(*)
`

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  type: z.enum(['bug', 'feature', 'task', 'improvement']).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  order: z.coerce.number().int().min(0).optional(),
})

async function fetchTicket(ticketId: string, workspaceId: string) {
  const { data, error } = await supabaseAdmin
    .from('tickets')
    .select(TICKET_SELECT)
    .eq('id', ticketId)
    .eq('workspace_id', workspaceId)
    .single()
  if (error || !data) return null
  return data
}

// GET /api/workspaces/:id/tickets/:ticketId
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id, ticketId } = await params

    const allowed = await isWorkspaceMemberOrOwner(id, userId)
    if (!allowed) return sendError('Accès refusé', 403)

    const ticket = await fetchTicket(ticketId, id)
    if (!ticket) return sendError('Ticket introuvable', 404)

    return sendSuccess({ ticket: mapTicket(ticket) })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}

// PATCH /api/workspaces/:id/tickets/:ticketId (JSON or FormData)
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id, ticketId } = await params

    const allowed = await isWorkspaceMemberOrOwner(id, userId)
    if (!allowed) return sendError('Accès refusé', 403)

    const existing = await fetchTicket(ticketId, id)
    if (!existing) return sendError('Ticket introuvable', 404)

    let fields: Record<string, string> = {}
    let files: File[] = []

    const contentType = request.headers.get('content-type') ?? ''
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      for (const [key, val] of form.entries()) {
        if (typeof val === 'string') fields[key] = val
        else files.push(val as File) // Blob/File in Node.js runtime
      }
    } else {
      fields = await request.json()
    }

    const parsed = updateSchema.safeParse(fields)
    if (!parsed.success) {
      return sendError(parsed.error.issues[0].message, 422)
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsed.data.title !== undefined) updates.title = parsed.data.title
    if (parsed.data.description !== undefined) updates.description = parsed.data.description
    if (parsed.data.status !== undefined) updates.status = parsed.data.status
    if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority
    if (parsed.data.type !== undefined) updates.type = parsed.data.type
    if (parsed.data.assigneeId !== undefined) updates.assignee_id = parsed.data.assigneeId ?? null
    if (parsed.data.order !== undefined) updates.order = parsed.data.order

    if (Object.keys(updates).length > 1) {
      const { error } = await supabaseAdmin
        .from('tickets')
        .update(updates)
        .eq('id', ticketId)
      if (error) return sendError('Mise à jour échouée', 500)
    }

    // Upload new files
    if (files.length > 0) {
      const uploads = await Promise.all(files.map(uploadFile))
      const attachmentRows = uploads.map((u) => ({
        ticket_id: ticketId,
        storage_key: u.storageKey,
        filename: u.filename,
        originalname: u.originalname,
        mime_type: u.mimeType,
        size: u.size,
      }))
      await supabaseAdmin.from('attachments').insert(attachmentRows)
    }

    const ticket = await fetchTicket(ticketId, id)

    // Notify new assignee if changed and different from updater
    const newAssigneeId = parsed.data.assigneeId
    if (
      newAssigneeId &&
      newAssigneeId !== existing.assignee_id &&
      newAssigneeId !== userId
    ) {
      const ticketLink = `/workspaces/${id}/kanban?ticket=${ticketId}`
      await createNotification(
        newAssigneeId,
        'ticket_assigned',
        'Ticket assigné',
        `Vous avez été assigné au ticket "${existing.title}"`,
        ticketLink
      )
      if (ticket?.assignee?.email) {
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://sparkhub.fr').replace(/\/$/, '')
        await sendTicketAssignedEmail(
          ticket.assignee.email,
          ticket.assignee.name,
          existing.title,
          `${appUrl}${ticketLink}`
        )
      }
    }

    return sendSuccess({ ticket: mapTicket(ticket!) })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}

// DELETE /api/workspaces/:id/tickets/:ticketId
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id, ticketId } = await params

    const allowed = await isWorkspaceMemberOrOwner(id, userId)
    if (!allowed) return sendError('Accès refusé', 403)

    const { error } = await supabaseAdmin
      .from('tickets')
      .delete()
      .eq('id', ticketId)
      .eq('workspace_id', id)

    if (error) return sendError('Suppression échouée', 500)

    return sendSuccess({ message: 'Ticket supprimé' })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
