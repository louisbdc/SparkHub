import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { isWorkspaceMemberOrOwner } from '@/lib/workspace-queries'
import { mapTicketTodo } from '@/lib/db-mappers'

type Params = { params: Promise<{ id: string; ticketId: string; todoId: string }> }

const patchSchema = z.object({
  done: z.boolean().optional(),
  text: z.string().min(1).max(500).optional(),
})

// PATCH /api/workspaces/:id/tickets/:ticketId/todos/:todoId
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id, ticketId, todoId } = await params

    const allowed = await isWorkspaceMemberOrOwner(id, userId)
    if (!allowed) return sendError('Accès refusé', 403)

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return sendError(parsed.error.issues[0].message, 422)
    if (parsed.data.done === undefined && parsed.data.text === undefined) {
      return sendError('Aucun champ à mettre à jour', 422)
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsed.data.done !== undefined) updates.done = parsed.data.done
    if (parsed.data.text !== undefined) updates.text = parsed.data.text

    const { data: todo, error } = await supabaseAdmin
      .from('ticket_todos')
      .update(updates)
      .eq('id', todoId)
      .eq('ticket_id', ticketId)
      .select()
      .single()

    if (error || !todo) return sendError('Todo introuvable', 404)

    return sendSuccess({ todo: mapTicketTodo(todo) })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}

// DELETE /api/workspaces/:id/tickets/:ticketId/todos/:todoId
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id, ticketId, todoId } = await params

    const allowed = await isWorkspaceMemberOrOwner(id, userId)
    if (!allowed) return sendError('Accès refusé', 403)

    const { error } = await supabaseAdmin
      .from('ticket_todos')
      .delete()
      .eq('id', todoId)
      .eq('ticket_id', ticketId)

    if (error) return sendError('Suppression échouée', 500)

    return sendSuccess({ message: 'Supprimé' })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
