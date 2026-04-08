import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
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

    // Per-request client so the refreshed session doesn't contaminate the
    // shared supabaseAdmin singleton.
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await authClient.auth.refreshSession({
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
