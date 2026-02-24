import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { mapProfile } from '@/lib/db-mappers'

const schema = z.object({
  token: z.string().min(1),
  refreshToken: z.string(),
  name: z.string().min(1).max(100),
  password: z.string().min(6),
})

// POST /api/invite/accept
// Called from /invite/accept page once the user fills in name + password.
// The token comes from the Supabase invite email redirect (URL hash).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return sendError(parsed.error.issues[0].message, 422)

    const { token, refreshToken, name, password } = parsed.data

    // Validate the invite token
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(token)
    if (getUserError || !user) return sendError("Invitation invalide ou expirée", 401)

    const workspaceId = user.user_metadata?.workspaceId as string | undefined
    const role = (user.user_metadata?.role as string) ?? 'client'

    // Set password and store name in auth metadata
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: { ...user.user_metadata, name },
    })
    if (updateError) return sendError('Impossible de définir le mot de passe', 500)

    // Create profile row
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: user.id, name, email: user.email!, role })
      .select()
      .single()

    if (profileError || !profile) return sendError('Erreur lors de la création du profil', 500)

    // Add to workspace
    if (workspaceId) {
      const { error: memberError } = await supabaseAdmin
        .from('workspace_members')
        .upsert(
          { workspace_id: workspaceId, user_id: user.id, role },
          { onConflict: 'workspace_id,user_id' }
        )
      if (memberError) console.error('[invite/accept] workspace_members upsert error:', memberError)
    }

    // Sign in with the new password to get a fresh session
    const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email!,
      password,
    })

    if (signInError || !session.session) {
      // Fallback: return the original invite token (still valid for ~1h)
      return sendSuccess({ user: mapProfile(profile), token, refreshToken })
    }

    return sendSuccess({
      user: mapProfile(profile),
      token: session.session.access_token,
      refreshToken: session.session.refresh_token,
    })
  } catch {
    return sendError('Erreur serveur', 500)
  }
}
