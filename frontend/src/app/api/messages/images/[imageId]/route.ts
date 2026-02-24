import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendError } from '@/lib/api-utils'
import { createSignedUrl } from '@/lib/file-upload'

type Params = { params: Promise<{ imageId: string }> }

// GET /api/messages/images/:imageId → redirect to signed URL (valid 5 min)
export async function GET(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(request)
    const { imageId } = await params

    const { data: image, error } = await supabaseAdmin
      .from('message_images')
      .select('storage_key')
      .eq('id', imageId)
      .single()

    if (error || !image) return sendError('Image introuvable', 404)

    const signedUrl = await createSignedUrl(image.storage_key, 300)

    return NextResponse.redirect(signedUrl)
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
