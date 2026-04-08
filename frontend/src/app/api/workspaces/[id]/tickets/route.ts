import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { isWorkspaceMemberOrOwner } from '@/lib/workspace-queries'
import { mapTicket } from '@/lib/db-mappers'
import { uploadFile } from '@/lib/file-upload'
import { createNotification } from '@/lib/notifications'
import { sendTicketAssignedEmail } from '@/lib/email'

type Params = { params: Promise<{ id: string }> }

const TICKET_SELECT = `
  *,
  reporter:profiles!tickets_reporter_id_fkey(*),
  assignee:profiles!tickets_assignee_id_fkey(*),
  attachments(*),
  ticket_todos(*)
`

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(''),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  type: z.enum(['bug', 'feature', 'task', 'improvement']).default('task'),
  assigneeId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
})

// GET /api/workspaces/:id/tickets
// ?parentId=<uuid>  → fetch sub-tickets of a parent
// (no param)        → fetch top-level tickets only (Kanban)
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id } = await params
    const parentId = new URL(request.url).searchParams.get('parentId')

    const allowed = await isWorkspaceMemberOrOwner(id, userId)
    if (!allowed) return sendError('Accès refusé', 403)

    let query = supabaseAdmin
      .from('tickets')
      .select(TICKET_SELECT)
      .eq('workspace_id', id)
      .order('order', { ascending: true })

    if (parentId) {
      query = query.eq('parent_id', parentId)
    } else {
      query = query.is('parent_id', null)
    }

    const { data: tickets, error } = await query
    if (error) {
      console.error('[tickets GET] Supabase error:', JSON.stringify(error))
      return sendError('Erreur lors de la récupération des tickets', 500)
    }

    const ticketIds = tickets?.map((t) => t.id) ?? []
    let readsMap = new Map<string, string>()

    if (ticketIds.length > 0) {
      const { data: reads } = await supabaseAdmin
        .from('ticket_reads')
        .select('ticket_id, last_read_at')
        .eq('user_id', userId)
        .in('ticket_id', ticketIds)

      reads?.forEach((r) => readsMap.set(r.ticket_id, r.last_read_at))
    }

    const formattedTickets = (tickets ?? []).map((t) => {
      const ticket = mapTicket(t)
      let hasUnreadComments = false

      if (t.last_comment_at) {
        const lastRead = readsMap.get(t.id)
        if (!lastRead) {
          hasUnreadComments = true
        } else if (new Date(t.last_comment_at) > new Date(lastRead)) {
          hasUnreadComments = true
        }
      }
      return { ...ticket, hasUnreadComments }
    })

    return sendSuccess({ tickets: formattedTickets })
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

    let fields: Record<string, unknown> = {}
    let attachmentFiles: File[] = []
    let descriptionImageFiles: File[] = []

    const contentType = request.headers.get('content-type') ?? ''
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      for (const [key, val] of form.entries()) {
        if (typeof val === 'string') fields[key] = val
        else if (key === 'descriptionImages') descriptionImageFiles.push(val as File)
        else attachmentFiles.push(val as File)
      }
    } else {
      fields = await request.json()
    }

    const parsed = createSchema.safeParse(fields)
    if (!parsed.success) {
      return sendError(parsed.error.issues[0].message, 422)
    }

    const { title, priority, type, assigneeId, parentId } = parsed.data

    // Parse todos — FormData sends a JSON string, JSON body sends the array directly
    let todosPayload: { text: string; done: boolean }[] = []
    try {
      if (fields.todos !== undefined) {
        todosPayload = typeof fields.todos === 'string'
          ? JSON.parse(fields.todos)
          : (fields.todos as { text: string; done: boolean }[])
      }
    } catch { /* ignore malformed todos */ }

    // Pre-generate UUIDs for inline images so we can embed their IDs in the description
    // before ticket creation, then insert them with those IDs after.
    const inlineImageIds = descriptionImageFiles.map(() => randomUUID())

    let description = parsed.data.description ?? ''
    inlineImageIds.forEach((imgId, idx) => {
      description = description.replace(`__IMGPASTE_${idx}__`, `/api/ticket-images/${imgId}`)
    })

    // Guard: prevent grandchildren (max one level of nesting)
    if (parentId) {
      const { data: parent } = await supabaseAdmin
        .from('tickets')
        .select('parent_id')
        .eq('id', parentId)
        .eq('workspace_id', id)
        .single()
      if (!parent) return sendError('Ticket parent introuvable', 404)
      if (parent.parent_id) return sendError('Les sous-tickets ne peuvent pas avoir de sous-tickets', 422)
    }

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
        parent_id: parentId ?? null,
        order,
      })
      .select('id')
      .single()

    if (error || !created) return sendError('Création du ticket échouée', 500)

    // Upload regular file attachments
    if (attachmentFiles.length > 0) {
      const uploads = await Promise.all(attachmentFiles.map(uploadFile))
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

    // Upload inline description images and insert with pre-generated IDs
    if (descriptionImageFiles.length > 0) {
      const uploads = await Promise.all(descriptionImageFiles.map(uploadFile))
      const imageRows = uploads.map((u, idx) => ({
        id: inlineImageIds[idx],
        ticket_id: created.id,
        storage_key: u.storageKey,
        filename: u.filename,
        originalname: u.originalname,
        mime_type: u.mimeType,
        size: u.size,
      }))
      const { error: imgErr } = await supabaseAdmin.from('ticket_images').insert(imageRows)
      if (imgErr) console.error('[ticket POST] ticket_images insert error:', imgErr)
    }

    // Insert todos
    if (todosPayload.length > 0) {
      const todoRows = todosPayload.map((t, idx) => ({
        ticket_id: created.id,
        text: t.text,
        done: t.done,
        order: idx,
      }))
      const { error: todoErr } = await supabaseAdmin.from('ticket_todos').insert(todoRows)
      if (todoErr) console.error('[ticket POST] ticket_todos insert error:', todoErr)
    }

    // Return full ticket with joins
    const { data: ticket, error: fetchError } = await supabaseAdmin
      .from('tickets')
      .select(TICKET_SELECT)
      .eq('id', created.id)
      .single()

    if (fetchError || !ticket) return sendError('Ticket créé mais récupération échouée', 500)

    const ticketLink = `/workspaces/${id}/kanban?ticket=${created.id}`

    // Notify all workspace members except the creator
    const { data: members } = await supabaseAdmin
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', id)
      .neq('user_id', userId)

    if (members && members.length > 0) {
      await Promise.all(
        members.map((m) =>
          createNotification(
            m.user_id,
            'ticket_created',
            'Nouveau ticket',
            `"${title}" a été créé dans le workspace`,
            ticketLink
          )
        )
      )
    }

    // Additionally notify assignee with a specific message
    if (assigneeId && assigneeId !== userId) {
      await createNotification(
        assigneeId,
        'ticket_assigned',
        'Ticket assigné',
        `Vous avez été assigné au ticket "${title}"`,
        ticketLink
      )
      if (ticket.assignee?.email) {
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://sparkhub.fr').replace(/\/$/, '')
        await sendTicketAssignedEmail(
          ticket.assignee.email,
          ticket.assignee.name,
          title,
          `${appUrl}${ticketLink}`
        )
      }
    }

    return sendSuccess({ ticket: mapTicket(ticket) }, 201)
  } catch (e) {
    if (e instanceof Response) return e
    console.error('[ticket POST] unexpected error:', e)
    return sendError('Erreur serveur', 500)
  }
}
