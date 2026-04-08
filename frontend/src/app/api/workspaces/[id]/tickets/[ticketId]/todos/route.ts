import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { isWorkspaceMemberOrOwner } from '@/lib/workspace-queries'
import { mapTicketTodo } from '@/lib/db-mappers'

type Params = { params: Promise<{ id: string; ticketId: string }> }

const createSchema = z.object({
  text: z.string().min(1).max(500),
  order: z.number().int().min(0).default(0),
})

// POST /api/workspaces/:id/tickets/:ticketId/todos
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id, ticketId } = await params

    const allowed = await isWorkspaceMemberOrOwner(id, userId)
    if (!allowed) return sendError('Accès refusé', 403)

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return sendError(parsed.error.issues[0].message, 422)

    const { data: todo, error } = await supabaseAdmin
      .from('ticket_todos')
      .insert({
        ticket_id: ticketId,
        text: parsed.data.text,
        done: false,
        order: parsed.data.order,
      })
      .select()
      .single()

    if (error || !todo) return sendError('Création du todo échouée', 500)

    return sendSuccess({ todo: mapTicketTodo(todo) }, 201)
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
