import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { mapProfile } from '@/lib/db-mappers'

// GET /api/auth/me → current user profile
export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireAuth(request)
    return sendSuccess({ user: mapProfile(profile) })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().url().nullable().optional(),
})

// PATCH /api/auth/me → update name / avatar
export async function PATCH(request: NextRequest) {
  try {
    const { userId, profile } = await requireAuth(request)

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return sendError(parsed.error.issues[0].message, 422)
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsed.data.name !== undefined) updates.name = parsed.data.name
    if (parsed.data.avatar !== undefined) updates.avatar = parsed.data.avatar

    const { data: updated, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error || !updated) return sendError('Mise à jour échouée', 500)

    return sendSuccess({ user: mapProfile({ ...profile, ...updated }) })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
