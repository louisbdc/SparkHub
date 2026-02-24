import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { isWorkspaceMemberOrOwner } from '@/lib/workspace-queries'
import { mapMessage } from '@/lib/db-mappers'
import { uploadFile } from '@/lib/file-upload'

type Params = { params: Promise<{ id: string }> }

// Base select without self-referential join (handled manually below)
const MESSAGE_SELECT = `
  *,
  author:profiles!messages_author_id_fkey(*),
  images:message_images(id, mime_type, originalname, size)
`

const REPLY_SELECT = `
  id, content,
  author:profiles!messages_author_id_fkey(id, name)
`

const createSchema = z.object({
  content: z.string().max(4000),
  replyTo: z.string().uuid().optional(),
})

// GET /api/workspaces/:id/messages
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id } = await params

    const allowed = await isWorkspaceMemberOrOwner(id, userId)
    if (!allowed) return sendError('Accès refusé', 403)

    const { data: rows, error } = await supabaseAdmin
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('workspace_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[messages GET]', error)
      return sendError('Erreur lors de la récupération des messages', 500)
    }

    const messages = rows ?? []

    // Resolve reply_to separately to avoid self-referential FK hint issues
    const replyIds = [...new Set(messages.map((m) => m.reply_to).filter(Boolean))]
    const replyMap: Record<string, unknown> = {}

    if (replyIds.length > 0) {
      const { data: replies } = await supabaseAdmin
        .from('messages')
        .select(REPLY_SELECT)
        .in('id', replyIds)

      for (const r of replies ?? []) {
        replyMap[r.id] = r
      }
    }

    const enriched = messages.map((m) => ({
      ...m,
      reply_to_message: m.reply_to ? (replyMap[m.reply_to] ?? null) : null,
    }))

    return sendSuccess({ messages: enriched.map(mapMessage) })
  } catch (e) {
    if (e instanceof Response) return e
    console.error('[messages GET catch]', e)
    return sendError('Erreur serveur', 500)
  }
}

// POST /api/workspaces/:id/messages
// Accepts JSON { content, replyTo? } or FormData { content, replyTo?, images[] }
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id } = await params

    const allowed = await isWorkspaceMemberOrOwner(id, userId)
    if (!allowed) return sendError('Accès refusé', 403)

    // Parse body — JSON or multipart
    const contentType = request.headers.get('content-type') ?? ''
    let rawContent: string
    let rawReplyTo: string | undefined
    let imageFiles: File[] = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      rawContent = (formData.get('content') as string) ?? ''
      rawReplyTo = (formData.get('replyTo') as string) || undefined
      imageFiles = formData.getAll('images').filter((v): v is File => v instanceof File)
    } else {
      const body = await request.json()
      rawContent = body.content
      rawReplyTo = body.replyTo
    }

    const parsed = createSchema.safeParse({ content: rawContent, replyTo: rawReplyTo })
    if (!parsed.success) return sendError(parsed.error.issues[0].message, 422)

    const { content, replyTo } = parsed.data

    // Upload images (if any) — Supabase Storage
    const uploadedImages = await Promise.all(imageFiles.map(uploadFile))

    // Insert message
    const { data: created, error: insertError } = await supabaseAdmin
      .from('messages')
      .insert({
        workspace_id: id,
        author_id: userId,
        content,
        ...(replyTo ? { reply_to: replyTo } : {}),
      })
      .select('id')
      .single()

    if (insertError || !created) return sendError('Envoi du message échoué', 500)

    // Insert image records
    if (uploadedImages.length > 0) {
      const imageRows = uploadedImages.map((img) => ({
        message_id: created.id,
        storage_key: img.storageKey,
        filename: img.filename,
        originalname: img.originalname,
        mime_type: img.mimeType,
        size: img.size,
      }))

      const { error: imgError } = await supabaseAdmin
        .from('message_images')
        .insert(imageRows)

      if (imgError) {
        // Rollback message on image insert failure
        await supabaseAdmin.from('messages').delete().eq('id', created.id)
        return sendError('Envoi des images échoué', 500)
      }
    }

    // Fetch the full message with joins for the response
    const { data: message } = await supabaseAdmin
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('id', created.id)
      .single()

    let replyMessage = null
    if (replyTo) {
      const { data: reply } = await supabaseAdmin
        .from('messages')
        .select(REPLY_SELECT)
        .eq('id', replyTo)
        .single()
      replyMessage = reply ?? null
    }

    return sendSuccess({ message: mapMessage({ ...message, reply_to_message: replyMessage }) }, 201)
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
