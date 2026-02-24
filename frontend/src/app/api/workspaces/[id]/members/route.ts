import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { fetchWorkspace } from '@/lib/workspace-queries'

type Params = { params: Promise<{ id: string }> }

const addSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'dev', 'client']).optional().default('client'),
})

// POST /api/workspaces/:id/members — add member by userId
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id } = await params

    const workspace = await fetchWorkspace(id)
    if (!workspace) return sendError('Workspace introuvable', 404)
    if (workspace.owner._id !== userId) return sendError('Accès refusé', 403)

    const body = await request.json()
    const parsed = addSchema.safeParse(body)
    if (!parsed.success) {
      return sendError(parsed.error.issues[0].message, 422)
    }

    const { userId: newMemberId, role } = parsed.data

    // Check user exists
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', newMemberId)
      .single()

    if (!profile) return sendError('Utilisateur introuvable', 404)

    const { error } = await supabaseAdmin
      .from('workspace_members')
      .upsert({ workspace_id: id, user_id: newMemberId, role })

    if (error) return sendError('Ajout du membre échoué', 500)

    const updated = await fetchWorkspace(id)
    return sendSuccess({ workspace: updated })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
