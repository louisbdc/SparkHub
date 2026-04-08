import { NextRequest } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'

const createSchema = z.object({ name: z.string().min(1).max(80) })

// GET /api/tokens → list current user's tokens (no raw token, just metadata)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)

    const { data, error } = await supabaseAdmin
      .from('personal_api_tokens')
      .select('id, name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) return sendError('Erreur serveur', 500)
    return sendSuccess({ tokens: data ?? [] })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}

// POST /api/tokens → create a new personal token (raw token shown once)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return sendError('Nom invalide', 400)

    const rawToken = `spk_${randomBytes(32).toString('hex')}`
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')

    const { data, error } = await supabaseAdmin
      .from('personal_api_tokens')
      .insert({ user_id: userId, name: parsed.data.name, token_hash: tokenHash })
      .select('id, name, created_at')
      .single()

    if (error || !data) return sendError('Création échouée', 500)

    return sendSuccess({
      token: rawToken,
      id: data.id,
      name: data.name,
      createdAt: data.created_at,
    })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
