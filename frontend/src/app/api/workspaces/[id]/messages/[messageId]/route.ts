import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { isWorkspaceMemberOrOwner } from '@/lib/workspace-queries'
import { mapMessage, type DbMessage } from '@/lib/db-mappers'
import { createSignedUrl } from '@/lib/file-upload'

type Params = { params: Promise<{ id: string; messageId: string }> }

const MESSAGE_SELECT = `
  *,
  author:profiles!messages_author_id_fkey(*),
  images:message_images(id, mime_type, originalname, size, storage_key)
`

const REPLY_SELECT = `
  id, content,
  author:profiles!messages_author_id_fkey(id, name)
`

async function fetchFullMessage(messageId: string) {
  const { data: row, error } = await supabaseAdmin
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('id', messageId)
    .single()

  if (error || !row) return null

  let replyMessage = null
  if (row.reply_to) {
    const { data: reply } = await supabaseAdmin
      .from('messages')
      .select(REPLY_SELECT)
      .eq('id', row.reply_to)
      .single()
    replyMessage = reply ?? null
  }

  const images = await Promise.all(
    (row.images ?? []).map(async (img: { id: string; storage_key: string; mime_type: string; originalname: string; size: number }) => {
      try {
        return { ...img, url: await createSignedUrl(img.storage_key, 3600) }
      } catch {
        return img
      }
    })
  )

  return mapMessage({ ...row, reply_to_message: replyMessage, images } as DbMessage)
}

// GET /api/workspaces/:id/messages/:messageId
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id, messageId } = await params

    const allowed = await isWorkspaceMemberOrOwner(id, userId)
    if (!allowed) return sendError('Accès refusé', 403)

    const message = await fetchFullMessage(messageId)
    if (!message) return sendError('Message introuvable', 404)

    return sendSuccess({ message })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}

// PATCH /api/workspaces/:id/messages/:messageId
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { messageId } = await params

    const body = await request.json()
    const parsed = z.object({ content: z.string().min(1).max(4000) }).safeParse(body)
    if (!parsed.success) return sendError(parsed.error.issues[0].message, 422)

    const { data: msg } = await supabaseAdmin
      .from('messages')
      .select('author_id')
      .eq('id', messageId)
      .single()

    if (!msg) return sendError('Message introuvable', 404)
    if (msg.author_id !== userId) return sendError('Accès refusé', 403)

    const { error } = await supabaseAdmin
      .from('messages')
      .update({ content: parsed.data.content })
      .eq('id', messageId)

    if (error) return sendError('Modification échouée', 500)

    const message = await fetchFullMessage(messageId)
    if (!message) return sendError('Message introuvable', 404)

    return sendSuccess({ message })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}

// DELETE /api/workspaces/:id/messages/:messageId
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { messageId } = await params

    const { data: msg } = await supabaseAdmin
      .from('messages')
      .select('author_id')
      .eq('id', messageId)
      .single()

    if (!msg) return sendError('Message introuvable', 404)
    if (msg.author_id !== userId) return sendError('Accès refusé', 403)

    const { error } = await supabaseAdmin.from('messages').delete().eq('id', messageId)
    if (error) return sendError('Suppression échouée', 500)

    return sendSuccess({ message: 'Message supprimé' })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
