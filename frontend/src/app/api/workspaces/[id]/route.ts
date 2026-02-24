import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { fetchWorkspace, isWorkspaceMemberOrOwner } from '@/lib/workspace-queries'

type Params = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

// GET /api/workspaces/:id
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id } = await params

    const allowed = await isWorkspaceMemberOrOwner(id, userId)
    if (!allowed) return sendError('Accès refusé', 403)

    const workspace = await fetchWorkspace(id)
    if (!workspace) return sendError('Workspace introuvable', 404)

    return sendSuccess({ workspace })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}

// PATCH /api/workspaces/:id
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id } = await params

    const workspace = await fetchWorkspace(id)
    if (!workspace) return sendError('Workspace introuvable', 404)
    if (workspace.owner._id !== userId) return sendError('Accès refusé', 403)

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return sendError(parsed.error.issues[0].message, 422)
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsed.data.name !== undefined) updates.name = parsed.data.name
    if (parsed.data.description !== undefined) updates.description = parsed.data.description
    if (parsed.data.color !== undefined) updates.color = parsed.data.color

    const { error } = await supabaseAdmin
      .from('workspaces')
      .update(updates)
      .eq('id', id)

    if (error) return sendError('Mise à jour échouée', 500)

    const updated = await fetchWorkspace(id)
    return sendSuccess({ workspace: updated })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}

// DELETE /api/workspaces/:id
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id } = await params

    const workspace = await fetchWorkspace(id)
    if (!workspace) return sendError('Workspace introuvable', 404)
    if (workspace.owner._id !== userId) return sendError('Accès refusé', 403)

    const { error } = await supabaseAdmin.from('workspaces').delete().eq('id', id)
    if (error) return sendError('Suppression échouée', 500)

    return sendSuccess({ message: 'Workspace supprimé' })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
