import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendError, sendSuccess } from '@/lib/api-utils'
import { createSignedUrl } from '@/lib/file-upload'

type Params = { params: Promise<{ fileId: string }> }

// GET /api/files/:fileId        → redirect to signed URL (download)
// GET /api/files/:fileId?json=1 → { url, mimeType, originalname } as JSON (preview)
export async function GET(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(request)
    const { fileId } = await params
    const json = request.nextUrl.searchParams.get('json') === '1'

    const { data: attachment, error } = await supabaseAdmin
      .from('attachments')
      .select('storage_key, originalname, mime_type')
      .eq('id', fileId)
      .single()

    if (error || !attachment) return sendError('Fichier introuvable', 404)

    // Preview URLs stay valid for 5 min; download redirects for 60 s
    const signedUrl = await createSignedUrl(attachment.storage_key, json ? 300 : 60)

    if (json) {
      return sendSuccess({
        url: signedUrl,
        mimeType: attachment.mime_type,
        originalname: attachment.originalname,
      })
    }

    return NextResponse.redirect(signedUrl)
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}
