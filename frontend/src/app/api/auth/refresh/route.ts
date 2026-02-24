import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendSuccess, sendError } from '@/lib/api-utils'

const schema = z.object({
  refreshToken: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return sendError('Refresh token manquant', 400)
    }

    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: parsed.data.refreshToken,
    })

    if (error || !data.session) {
      return sendError('Session expirée', 401)
    }

    return sendSuccess({
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    })
  } catch {
    return sendError('Erreur serveur', 500)
  }
}
