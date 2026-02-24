import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { mapMessage } from '@/lib/db-mappers'

type Params = { params: Promise<{ id: string; messageId: string }> }

const MESSAGE_SELECT = `
  *,
  author:profiles!messages_author_id_fkey(*),
  images:message_images(id, mime_type, originalname, size)
`

const REPLY_SELECT = `
  id, content,
  author:profiles!messages_author_id_fkey(id, name)
`

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

    const { data: updated } = await supabaseAdmin
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('id', messageId)
      .single()

    let replyMessage = null
    if (updated?.reply_to) {
      const { data: reply } = await supabaseAdmin
        .from('messages')
        .select(REPLY_SELECT)
        .eq('id', updated.reply_to)
        .single()
      replyMessage = reply ?? null
    }

    return sendSuccess({ message: mapMessage({ ...updated, reply_to_message: replyMessage }) })
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
