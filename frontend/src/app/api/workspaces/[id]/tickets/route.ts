import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { isWorkspaceMemberOrOwner } from '@/lib/workspace-queries'
import { mapTicket } from '@/lib/db-mappers'
import { uploadFile } from '@/lib/file-upload'
import { createNotification } from '@/lib/notifications'

type Params = { params: Promise<{ id: string }> }

const TICKET_SELECT = `
  *,
  reporter:profiles!tickets_reporter_id_fkey(*),
  assignee:profiles!tickets_assignee_id_fkey(*),
  attachments(*)
`

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(''),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  type: z.enum(['bug', 'feature', 'task', 'improvement']).default('task'),
  assigneeId: z.string().uuid().optional().nullable(),
})

// GET /api/workspaces/:id/tickets
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id } = await params

    const allowed = await isWorkspaceMemberOrOwner(id, userId)
    if (!allowed) return sendError('Accès refusé', 403)

    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select(TICKET_SELECT)
      .eq('workspace_id', id)
      .order('order', { ascending: true })

    if (error) return sendError('Erreur lors de la récupération des tickets', 500)

    return sendSuccess({ tickets: (tickets ?? []).map(mapTicket) })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}

// POST /api/workspaces/:id/tickets (JSON or FormData with attachments)
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id } = await params

    const allowed = await isWorkspaceMemberOrOwner(id, userId)
    if (!allowed) return sendError('Accès refusé', 403)

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

    const parsed = createSchema.safeParse(fields)
    if (!parsed.success) {
      return sendError(parsed.error.issues[0].message, 422)
    }

    const { title, description, priority, type, assigneeId } = parsed.data

    // Get max order in the target column (backlog)
    const { data: maxRow } = await supabaseAdmin
      .from('tickets')
      .select('order')
      .eq('workspace_id', id)
      .eq('status', 'backlog')
      .order('order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const order = maxRow ? (maxRow.order as number) + 1 : 0

    const { data: created, error } = await supabaseAdmin
      .from('tickets')
      .insert({
        workspace_id: id,
        title,
        description,
        priority,
        type,
        status: 'backlog',
        reporter_id: userId,
        assignee_id: assigneeId ?? null,
        order,
      })
      .select('id')
      .single()

    if (error || !created) return sendError('Création du ticket échouée', 500)

    // Upload files and insert attachment rows
    if (files.length > 0) {
      const uploads = await Promise.all(files.map(uploadFile))
      const attachmentRows = uploads.map((u) => ({
        ticket_id: created.id,
        storage_key: u.storageKey,
        filename: u.filename,
        originalname: u.originalname,
        mime_type: u.mimeType,
        size: u.size,
      }))
      const { error: attErr } = await supabaseAdmin.from('attachments').insert(attachmentRows)
      if (attErr) console.error('[ticket POST] attachments insert error:', attErr)
    }

    // Return full ticket with joins
    const { data: ticket, error: fetchError } = await supabaseAdmin
      .from('tickets')
      .select(TICKET_SELECT)
      .eq('id', created.id)
      .single()

    if (fetchError || !ticket) return sendError('Ticket créé mais récupération échouée', 500)

    // Notify assignee if different from reporter
    if (assigneeId && assigneeId !== userId) {
      const workspaceLink = `/workspaces/${id}/kanban`
      await createNotification(
        assigneeId,
        'ticket_assigned',
        'Ticket assigné',
        `Vous avez été assigné au ticket "${title}"`,
        workspaceLink
      )
    }

    return sendSuccess({ ticket: mapTicket(ticket) }, 201)
  } catch (e) {
    if (e instanceof Response) return e
    console.error('[ticket POST] unexpected error:', e)
    return sendError('Erreur serveur', 500)
  }
}
