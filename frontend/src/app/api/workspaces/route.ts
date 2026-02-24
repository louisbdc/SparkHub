import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { uniqueSlug } from '@/lib/slug'
import { fetchWorkspace, listWorkspacesForUser } from '@/lib/workspace-queries'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#6366f1'),
})

// GET /api/workspaces — list workspaces for current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)
    const workspaces = await listWorkspacesForUser(userId)
    return sendSuccess({ workspaces })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}

// POST /api/workspaces — create workspace
export async function POST(request: NextRequest) {
  try {
    const { userId, profile } = await requireAuth(request)

    if (profile.role === 'client') {
      return sendError('Accès refusé', 403)
    }

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return sendError(parsed.error.issues[0].message, 422)
    }

    const { name, description, color } = parsed.data

    const slug = await uniqueSlug(name, async (s) => {
      const { data } = await supabaseAdmin.from('workspaces').select('id').eq('slug', s).single()
      return Boolean(data)
    })

    const { data: created, error } = await supabaseAdmin
      .from('workspaces')
      .insert({ name, slug, description, color, owner_id: userId })
      .select('id')
      .single()

    if (error || !created) return sendError('Création échouée', 500)

    const workspace = await fetchWorkspace(created.id)
    if (!workspace) return sendError('Erreur serveur', 500)

    return sendSuccess({ workspace }, 201)
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
