import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// 10 attempts per 15 minutes per IP
const LIMIT = 10
const WINDOW_MS = 15 * 60 * 1000

const schema = z.object({
  accessToken: z.string().min(1),
  newPassword: z.string().min(8).max(128),
})

export async function POST(req: Request) {
  const ip = getClientIp(req)
  if (!checkRateLimit(`reset-password:${ip}`, LIMIT, WINDOW_MS)) {
    return NextResponse.json({ success: false, error: 'Trop de tentatives. Réessayez dans 15 minutes.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { accessToken, newPassword } = schema.parse(body)

    // Validate the recovery token and get the user
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(accessToken)

    if (getUserError || !user) {
      return NextResponse.json(
        { success: false, error: 'Lien invalide ou expiré' },
        { status: 401 }
      )
    }

    // Update the password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    })

    if (updateError) {
      console.error('[reset-password] updateUserById error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Impossible de mettre à jour le mot de passe' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Mot de passe mis à jour avec succès' },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 })
    }
    console.error('[reset-password]', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
