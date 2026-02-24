import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { mapProfile } from '@/lib/db-mappers'

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['dev', 'client']).default('client'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return sendError(parsed.error.issues[0].message, 422)
    }

    const { name, email, password, role } = parsed.data

    // Create auth user (auto-confirmed)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    })

    if (authError) {
      const msg = authError.message.includes('already registered')
        ? 'Email déjà utilisé'
        : authError.message
      return sendError(msg, 409)
    }

    const userId = authData.user.id

    // Insert profile (trigger may also do this — use upsert to be safe)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: userId, name, email, role })
      .select()
      .single()

    if (profileError || !profile) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return sendError('Erreur lors de la création du profil', 500)
    }

    // Sign in to get access token
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })

    if (sessionError || !sessionData.session) {
      return sendError('Compte créé mais connexion échouée', 500)
    }

    return sendSuccess(
      {
        user: mapProfile(profile),
        token: sessionData.session.access_token,
        refreshToken: sessionData.session.refresh_token,
      },
      201
    )
  } catch {
    return sendError('Erreur serveur', 500)
  }
}
