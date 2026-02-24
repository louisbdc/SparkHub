import { supabaseAdmin } from './supabase/admin'
import type { DbProfile } from './db-mappers'

export interface AuthContext {
  userId: string
  profile: DbProfile
}

/**
 * Validates the Bearer token from the Authorization header.
 * Throws a Response with 401 if invalid — call inside a try/catch
 * or use the convenience wrappers below.
 */
export async function requireAuth(request: Request): Promise<AuthContext> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) throw unauthorized()

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw unauthorized()

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile) throw unauthorized()

  return { userId: user.id, profile: profile as DbProfile }
}

function unauthorized(): Response {
  return new Response(
    JSON.stringify({ success: false, error: 'Non authentifié' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  )
}
