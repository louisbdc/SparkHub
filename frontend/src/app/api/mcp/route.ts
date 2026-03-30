import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isWorkspaceMemberOrOwner, listWorkspacesForUser, fetchWorkspace } from '@/lib/workspace-queries'
import { mapTicket, mapComment, mapAttachment } from '@/lib/db-mappers'
import { createNotification } from '@/lib/notifications'
import { createSignedUrl } from '@/lib/file-upload'

// --- Constants ---

const SERVER_INFO = { name: 'sparkhub', version: '1.0.0' }
const PROTOCOL_VERSION = '2024-11-05'
const MCP_API_KEY = process.env.MCP_API_KEY
const MCP_USER_ID = process.env.MCP_USER_ID

const TICKET_SELECT = `
  *,
  reporter:profiles!tickets_reporter_id_fkey(*),
  assignee:profiles!tickets_assignee_id_fkey(*),
  attachments(*)
`

const COMMENT_SELECT = `*, author:profiles!comments_author_id_fkey(*)`

// --- Tool definitions ---

const TOOLS = [
  {
    name: 'list_workspaces',
    description: 'Lister tous les workspaces accessibles. Retourne le nom, slug, description, couleur et nombre de membres de chaque workspace.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_workspace',
    description: 'Obtenir les details d\'un workspace: membres, invitations en attente, description.',
    inputSchema: {
      type: 'object' as const,
      properties: { workspaceId: { type: 'string', description: 'ID du workspace' } },
      required: ['workspaceId'],
    },
  },
  {
    name: 'list_tickets',
    description: 'Lister les tickets d\'un workspace (vue kanban). Peut filtrer par statut, priorite ou type.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspaceId: { type: 'string', description: 'ID du workspace' },
        status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'review', 'done'], description: 'Filtrer par statut' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Filtrer par priorite' },
        type: { type: 'string', enum: ['bug', 'feature', 'task', 'improvement'], description: 'Filtrer par type' },
      },
      required: ['workspaceId'],
    },
  },
  {
    name: 'get_ticket',
    description: 'Obtenir les details complets d\'un ticket: description, assignee, reporter, pieces jointes, et sous-tickets.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspaceId: { type: 'string', description: 'ID du workspace' },
        ticketId: { type: 'string', description: 'ID du ticket' },
      },
      required: ['workspaceId', 'ticketId'],
    },
  },
  {
    name: 'list_comments',
    description: 'Lister les commentaires d\'un ticket. Retourne auteur, contenu et date.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspaceId: { type: 'string', description: 'ID du workspace' },
        ticketId: { type: 'string', description: 'ID du ticket' },
      },
      required: ['workspaceId', 'ticketId'],
    },
  },
  {
    name: 'create_ticket',
    description: 'Creer un nouveau ticket dans un workspace. Necessite au minimum un titre.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspaceId: { type: 'string', description: 'ID du workspace' },
        title: { type: 'string', description: 'Titre du ticket' },
        description: { type: 'string', description: 'Description (markdown)' },
        status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'review', 'done'], description: 'Statut initial (defaut: backlog)' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Priorite (defaut: medium)' },
        type: { type: 'string', enum: ['bug', 'feature', 'task', 'improvement'], description: 'Type (defaut: task)' },
      },
      required: ['workspaceId', 'title'],
    },
  },
  {
    name: 'update_ticket_status',
    description: 'Changer le statut d\'un ticket (deplacer sur le kanban). Ex: todo -> in_progress -> review -> done.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspaceId: { type: 'string', description: 'ID du workspace' },
        ticketId: { type: 'string', description: 'ID du ticket' },
        status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'review', 'done'], description: 'Nouveau statut' },
      },
      required: ['workspaceId', 'ticketId', 'status'],
    },
  },
  {
    name: 'list_attachments',
    description: 'Lister les pieces jointes d\'un ticket. Retourne le nom, type MIME, taille et ID de chaque fichier.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspaceId: { type: 'string', description: 'ID du workspace' },
        ticketId: { type: 'string', description: 'ID du ticket' },
      },
      required: ['workspaceId', 'ticketId'],
    },
  },
  {
    name: 'get_attachment',
    description: 'Lire le contenu d\'une piece jointe. Pour les fichiers texte (code, markdown, JSON, CSV, etc.), retourne le contenu. Pour les fichiers binaires (images, PDF, etc.), retourne les metadonnees et une URL signee de telechargement.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspaceId: { type: 'string', description: 'ID du workspace' },
        ticketId: { type: 'string', description: 'ID du ticket' },
        attachmentId: { type: 'string', description: 'ID de la piece jointe' },
      },
      required: ['workspaceId', 'ticketId', 'attachmentId'],
    },
  },
  {
    name: 'add_comment',
    description: 'Ajouter un commentaire sur un ticket.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspaceId: { type: 'string', description: 'ID du workspace' },
        ticketId: { type: 'string', description: 'ID du ticket' },
        content: { type: 'string', description: 'Contenu du commentaire (markdown)' },
      },
      required: ['workspaceId', 'ticketId', 'content'],
    },
  },
]

// --- Zod schemas for tool input validation ---

const getWorkspaceSchema = z.object({ workspaceId: z.string() })
const listTicketsSchema = z.object({
  workspaceId: z.string(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  type: z.enum(['bug', 'feature', 'task', 'improvement']).optional(),
})
const getTicketSchema = z.object({ workspaceId: z.string(), ticketId: z.string() })
const listCommentsSchema = z.object({ workspaceId: z.string(), ticketId: z.string() })
const createTicketSchema = z.object({
  workspaceId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(''),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional().default('backlog'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  type: z.enum(['bug', 'feature', 'task', 'improvement']).optional().default('task'),
})
const updateTicketStatusSchema = z.object({
  workspaceId: z.string(),
  ticketId: z.string(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']),
})
const listAttachmentsSchema = z.object({ workspaceId: z.string(), ticketId: z.string() })
const getAttachmentSchema = z.object({ workspaceId: z.string(), ticketId: z.string(), attachmentId: z.string() })
const addCommentSchema = z.object({
  workspaceId: z.string(),
  ticketId: z.string(),
  content: z.string().min(1).max(4000),
})

// --- JSON-RPC helpers ---

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: string | number
  method: string
  params?: Record<string, unknown>
}

function jsonRpcResult(id: string | number | undefined, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result })
}

function jsonRpcError(id: string | number | undefined, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } })
}

function textContent(text: string) {
  return { content: [{ type: 'text' as const, text }] }
}

// --- Tool execution ---

async function executeTool(name: string, args: Record<string, unknown>, userId: string) {
  switch (name) {
    case 'list_workspaces': {
      const workspaces = await listWorkspacesForUser(userId)
      return textContent(JSON.stringify(workspaces, null, 2))
    }

    case 'get_workspace': {
      const { workspaceId } = getWorkspaceSchema.parse(args)
      const allowed = await isWorkspaceMemberOrOwner(workspaceId, userId)
      if (!allowed) return textContent('Acces refuse a ce workspace')

      const workspace = await fetchWorkspace(workspaceId)
      if (!workspace) return textContent('Workspace introuvable')
      return textContent(JSON.stringify(workspace, null, 2))
    }

    case 'list_tickets': {
      const { workspaceId, status, priority, type } = listTicketsSchema.parse(args)
      const allowed = await isWorkspaceMemberOrOwner(workspaceId, userId)
      if (!allowed) return textContent('Acces refuse a ce workspace')

      const query = supabaseAdmin
        .from('tickets')
        .select(TICKET_SELECT)
        .eq('workspace_id', workspaceId)
        .is('parent_id', null)
        .order('order', { ascending: true })

      const { data: tickets, error } = await query
      if (error) return textContent('Erreur lors de la recuperation des tickets')

      let mapped = (tickets ?? []).map(mapTicket)
      if (status) mapped = mapped.filter((t) => t.status === status)
      if (priority) mapped = mapped.filter((t) => t.priority === priority)
      if (type) mapped = mapped.filter((t) => t.type === type)

      return textContent(JSON.stringify(mapped, null, 2))
    }

    case 'get_ticket': {
      const { workspaceId, ticketId } = getTicketSchema.parse(args)
      const allowed = await isWorkspaceMemberOrOwner(workspaceId, userId)
      if (!allowed) return textContent('Acces refuse a ce workspace')

      const [ticketRes, childrenRes] = await Promise.all([
        supabaseAdmin.from('tickets').select(TICKET_SELECT).eq('id', ticketId).eq('workspace_id', workspaceId).single(),
        supabaseAdmin.from('tickets').select(TICKET_SELECT).eq('parent_id', ticketId).eq('workspace_id', workspaceId).order('order', { ascending: true }),
      ])

      if (ticketRes.error) return textContent('Ticket introuvable')

      return textContent(JSON.stringify({
        ticket: mapTicket(ticketRes.data),
        subTickets: (childrenRes.data ?? []).map(mapTicket),
      }, null, 2))
    }

    case 'list_comments': {
      const { workspaceId, ticketId } = listCommentsSchema.parse(args)
      const allowed = await isWorkspaceMemberOrOwner(workspaceId, userId)
      if (!allowed) return textContent('Acces refuse a ce workspace')

      const { data: comments, error } = await supabaseAdmin
        .from('comments')
        .select(COMMENT_SELECT)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (error) return textContent('Erreur lors de la recuperation des commentaires')
      return textContent(JSON.stringify((comments ?? []).map(mapComment), null, 2))
    }

    case 'create_ticket': {
      const { workspaceId, title, description, status, priority, type } = createTicketSchema.parse(args)
      const allowed = await isWorkspaceMemberOrOwner(workspaceId, userId)
      if (!allowed) return textContent('Acces refuse a ce workspace')

      const { data: maxRow } = await supabaseAdmin
        .from('tickets')
        .select('order')
        .eq('workspace_id', workspaceId)
        .eq('status', status)
        .order('order', { ascending: false })
        .limit(1)
        .maybeSingle()

      const order = maxRow ? (maxRow.order as number) + 1 : 0

      const { data: created, error } = await supabaseAdmin
        .from('tickets')
        .insert({
          workspace_id: workspaceId,
          title,
          description,
          priority,
          type,
          status,
          reporter_id: userId,
          order,
        })
        .select('id')
        .single()

      if (error || !created) return textContent('Creation du ticket echouee')

      const { data: ticket } = await supabaseAdmin
        .from('tickets')
        .select(TICKET_SELECT)
        .eq('id', created.id)
        .single()

      return textContent(JSON.stringify(mapTicket(ticket), null, 2))
    }

    case 'update_ticket_status': {
      const { workspaceId, ticketId, status } = updateTicketStatusSchema.parse(args)
      const allowed = await isWorkspaceMemberOrOwner(workspaceId, userId)
      if (!allowed) return textContent('Acces refuse a ce workspace')

      const { error } = await supabaseAdmin
        .from('tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', ticketId)
        .eq('workspace_id', workspaceId)

      if (error) return textContent('Mise a jour du statut echouee')

      const { data: ticket } = await supabaseAdmin
        .from('tickets')
        .select(TICKET_SELECT)
        .eq('id', ticketId)
        .single()

      if (ticket) {
        const workspaceLink = `/workspaces/${workspaceId}/kanban?ticket=${ticketId}`
        const notifBody = `Statut du ticket "${ticket.title}" change en "${status}"`
        const recipients = new Set<string>()
        if (ticket.reporter_id && ticket.reporter_id !== userId) recipients.add(ticket.reporter_id)
        if (ticket.assignee_id && ticket.assignee_id !== userId) recipients.add(ticket.assignee_id)
        await Promise.all(
          [...recipients].map((uid) =>
            createNotification(uid, 'ticket_status_changed', 'Statut modifie', notifBody, workspaceLink)
          )
        )
      }

      return textContent(JSON.stringify(mapTicket(ticket), null, 2))
    }

    case 'list_attachments': {
      const { workspaceId, ticketId } = listAttachmentsSchema.parse(args)
      const allowed = await isWorkspaceMemberOrOwner(workspaceId, userId)
      if (!allowed) return textContent('Acces refuse a ce workspace')

      const { data: attachments, error } = await supabaseAdmin
        .from('attachments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('uploaded_at', { ascending: true })

      if (error) return textContent('Erreur lors de la recuperation des pieces jointes')
      if (!attachments?.length) return textContent('Aucune piece jointe sur ce ticket.')

      return textContent(JSON.stringify(attachments.map(mapAttachment), null, 2))
    }

    case 'get_attachment': {
      const { workspaceId, ticketId, attachmentId } = getAttachmentSchema.parse(args)
      const allowed = await isWorkspaceMemberOrOwner(workspaceId, userId)
      if (!allowed) return textContent('Acces refuse a ce workspace')

      const { data: attachment, error } = await supabaseAdmin
        .from('attachments')
        .select('*')
        .eq('id', attachmentId)
        .eq('ticket_id', ticketId)
        .single()

      if (error || !attachment) return textContent('Piece jointe introuvable.')

      const mapped = mapAttachment(attachment)
      const isText = /^(text\/|application\/(json|xml|javascript|typescript|x-yaml|x-sh|csv|markdown))/.test(mapped.mimeType)

      if (isText) {
        const signedUrl = await createSignedUrl(attachment.storage_key, 60)
        const res = await fetch(signedUrl)
        if (!res.ok) return textContent(`Erreur lors du telechargement: ${res.status} ${res.statusText}`)
        const content = await res.text()
        return textContent(
          `# ${mapped.originalname}\n\nType: ${mapped.mimeType}\nTaille: ${mapped.size} octets\n\n---\n\n${content}`
        )
      }

      const downloadUrl = await createSignedUrl(attachment.storage_key, 300)
      return textContent(JSON.stringify({
        filename: mapped.originalname,
        mimeType: mapped.mimeType,
        size: mapped.size,
        downloadUrl,
      }, null, 2))
    }

    case 'add_comment': {
      const { workspaceId, ticketId, content } = addCommentSchema.parse(args)
      const allowed = await isWorkspaceMemberOrOwner(workspaceId, userId)
      if (!allowed) return textContent('Acces refuse a ce workspace')

      const { data: created, error } = await supabaseAdmin
        .from('comments')
        .insert({ ticket_id: ticketId, author_id: userId, content })
        .select('id')
        .single()

      if (error || !created) return textContent('Creation du commentaire echouee')

      const { data: comment } = await supabaseAdmin
        .from('comments')
        .select(COMMENT_SELECT)
        .eq('id', created.id)
        .single()

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

      return textContent(JSON.stringify(mapComment(comment), null, 2))
    }

    default:
      throw new Error(`Tool inconnu: ${name}`)
  }
}

// --- Route handler ---

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as JsonRpcRequest

    // Handle initialize — no auth needed
    if (body.method === 'initialize') {
      return jsonRpcResult(body.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      })
    }

    // Handle notifications — no response needed
    if (body.method === 'notifications/initialized') {
      return new NextResponse(null, { status: 202 })
    }

    // Handle ping
    if (body.method === 'ping') {
      return jsonRpcResult(body.id, {})
    }

    // All other methods require API key auth
    const authHeader = request.headers.get('authorization') ?? ''
    const providedKey = authHeader.replace('Bearer ', '')

    if (!MCP_API_KEY || !MCP_USER_ID || providedKey !== MCP_API_KEY) {
      return jsonRpcError(body.id, -32600, 'Cle API MCP invalide')
    }

    const userId = MCP_USER_ID

    if (body.method === 'tools/list') {
      return jsonRpcResult(body.id, { tools: TOOLS })
    }

    if (body.method === 'tools/call') {
      const toolName = (body.params as { name: string })?.name
      const toolArgs = (body.params as { arguments?: Record<string, unknown> })?.arguments ?? {}

      try {
        const result = await executeTool(toolName, toolArgs, userId)
        return jsonRpcResult(body.id, result)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return jsonRpcResult(body.id, textContent(`Erreur: ${message}`))
      }
    }

    return jsonRpcError(body.id, -32601, `Methode inconnue: ${body.method}`)
  } catch {
    return jsonRpcError(undefined, -32603, 'Erreur serveur interne')
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', server: SERVER_INFO })
}

export async function DELETE() {
  return new NextResponse(null, { status: 202 })
}
