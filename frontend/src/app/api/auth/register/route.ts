import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendSuccess, sendError } from '@/lib/api-utils'

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // Use the regular signUp flow (not admin) so Supabase sends the confirmation email
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
        emailRedirectTo: `${appUrl}/login`,
      },
    })

    if (authError) {
      const msg = authError.message.includes('already registered')
        ? 'Email déjà utilisé'
        : authError.message
      return sendError(msg, 409)
    }

    if (!authData.user) {
      return sendError("Erreur lors de la création du compte", 500)
    }

    // Create profile row immediately so it exists when the user confirms and logs in
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: authData.user.id, name, email, role })

    if (profileError) {
      console.error('[register] profile upsert error:', profileError)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return sendError('Erreur lors de la création du profil', 500)
    }

    return sendSuccess({ emailConfirmationRequired: true }, 201)
  } catch {
    return sendError('Erreur serveur', 500)
  }
}
