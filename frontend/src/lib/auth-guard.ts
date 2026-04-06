import { createHash } from 'crypto'
import { supabaseAdmin } from './supabase/admin'
import type { DbProfile } from './db-mappers'

export interface AuthContext {
  userId: string
  profile: DbProfile
}

const AUTH_CACHE_TTL = 60_000 // 60 seconds
const AUTH_CACHE_MAX = 500
const authCache = new Map<string, { context: AuthContext; expiresAt: number }>()

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function evictExpired() {
  const now = Date.now()
  for (const [key, val] of authCache) {
    if (val.expiresAt < now) authCache.delete(key)
  }
}

export function clearAuthCacheForToken(token: string) {
  authCache.delete(hashToken(token))
}

/**
 * Validates the Bearer token from the Authorization header.
 * Results are cached for 60s per hashed token to avoid redundant Supabase calls.
 * Throws a Response with 401 if invalid.
 */
export async function requireAuth(request: Request): Promise<AuthContext> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) throw unauthorized()

  const key = hashToken(token)

  const cached = authCache.get(key)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.context
  }

  if (authCache.size >= AUTH_CACHE_MAX) {
    evictExpired()
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) {
    authCache.delete(key)
    throw unauthorized()
  }

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile) {
    authCache.delete(key)
    throw unauthorized()
  }

  const context: AuthContext = { userId: user.id, profile: profile as DbProfile }
  authCache.set(key, { context, expiresAt: Date.now() + AUTH_CACHE_TTL })

  return context
}

function unauthorized(): Response {
  return new Response(
    JSON.stringify({ success: false, error: 'Non authentifié' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  )
}
