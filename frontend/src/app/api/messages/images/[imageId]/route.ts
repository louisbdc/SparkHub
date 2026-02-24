import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendError, sendSuccess } from '@/lib/api-utils'
import { createSignedUrl } from '@/lib/file-upload'

type Params = { params: Promise<{ imageId: string }> }

// GET /api/messages/images/:imageId         → redirect to signed URL
// GET /api/messages/images/:imageId?json=1  → { url, mimeType, originalname }
export async function GET(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(request)
    const { imageId } = await params
    const json = request.nextUrl.searchParams.get('json') === '1'

    const { data: image, error } = await supabaseAdmin
      .from('message_images')
      .select('storage_key, mime_type, originalname')
      .eq('id', imageId)
      .single()

    if (error || !image) return sendError('Image introuvable', 404)

    const signedUrl = await createSignedUrl(image.storage_key, 300)

    if (json) {
      return sendSuccess({
        url: signedUrl,
        mimeType: image.mime_type,
        originalname: image.originalname,
      })
    }

    return NextResponse.redirect(signedUrl)
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
