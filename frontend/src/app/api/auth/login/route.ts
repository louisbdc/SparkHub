import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { mapProfile } from '@/lib/db-mappers'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return sendError('Email ou mot de passe invalide', 400)
    }

    const { email, password } = parsed.data

    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })

    if (sessionError || !sessionData.session) {
      return sendError('Email ou mot de passe incorrect', 401)
    }

    const userId = sessionData.user.id

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return sendError('Profil introuvable', 404)
    }

    return sendSuccess({
      user: mapProfile(profile),
      token: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token,
    })
  } catch {
    return sendError('Erreur serveur', 500)
  }
}
