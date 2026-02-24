import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
})

// PATCH /api/auth/password
export async function PATCH(request: NextRequest) {
  try {
    const { userId, profile } = await requireAuth(request)

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return sendError(parsed.error.issues[0].message, 422)
    }

    const { currentPassword, newPassword } = parsed.data

    // Verify current password by attempting sign-in
    const { error: verifyError } = await supabaseAdmin.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    })

    if (verifyError) {
      return sendError('Mot de passe actuel incorrect', 401)
    }

    // Update password via admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (updateError) return sendError('Mise à jour du mot de passe échouée', 500)

    return sendSuccess({ message: 'Mot de passe mis à jour' })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
