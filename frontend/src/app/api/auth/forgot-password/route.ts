import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// 5 requests per hour per IP
const LIMIT = 5
const WINDOW_MS = 60 * 60 * 1000

const schema = z.object({
  email: z.string().email(),
})

export async function POST(req: Request) {
  const ip = getClientIp(req)
  if (!checkRateLimit(`forgot-password:${ip}`, LIMIT, WINDOW_MS)) {
    return NextResponse.json({ success: false, error: 'Trop de tentatives. Réessayez dans une heure.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { email } = schema.parse(body)

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    })

    // Always succeed to avoid email enumeration
    return NextResponse.json({
      success: true,
      data: { message: 'Si ce compte existe, un email a été envoyé.' },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Email invalide' }, { status: 400 })
    }
    console.error('[forgot-password]', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
