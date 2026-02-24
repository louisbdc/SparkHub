import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'

const BUCKET = 'avatars'
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

// POST /api/auth/avatar — upload avatar image, return public URL
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return sendError('Aucun fichier fourni', 400)
    if (!file.type.startsWith('image/')) return sendError('Seules les images sont acceptées', 400)
    if (file.size > MAX_SIZE) return sendError('Image trop lourde (max 5 MB)', 400)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const storageKey = `${userId}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storageKey, buffer, { contentType: file.type, upsert: true })

    if (error) return sendError('Upload échoué : ' + error.message, 500)

    const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storageKey)

    return sendSuccess({ url: publicUrl })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
